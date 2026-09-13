import { IEmailJob, IVerifyEmailJob } from '@/common/interfaces/job.interface';
import { Uuid } from '@/common/types/common.type';
import { Branded } from '@/common/types/types';
import { AllConfigType } from '@/config/config.type';
import { SYSTEM_USER_ID } from '@/constants/app.constant';
import { CacheKey } from '@/constants/cache.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { createCacheKey } from '@/utils/cache.util';
import { verifyPassword } from '@/utils/password.util';
import { InjectQueue } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import crypto from 'crypto';
import ms from 'ms';
import { Repository } from 'typeorm';
import { SessionEntity } from '../user/entities/session.entity';
import { UserEntity } from '../user/entities/user.entity';
import { LoginReqDto } from './dto/login.req.dto';
import { RegisterReqDto } from './dto/register.req.dto';
import { RegisterResDto } from './dto/register.res.dto';
import { JwtPayloadType } from './types/jwt-payload.type';
import { JwtRefreshPayloadType } from './types/jwt-refresh-payload.type';

type Token = Branded<
  {
    accessToken: string;
    refreshToken: string;
    tokenExpires: number;
  },
  'token'
>;

export type AuthTokenResult = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpires: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Sign in user
   * @param dto LoginReqDto
   * @returns AuthTokenResult (controller sets cookie + strips refreshToken from response)
   */
  async signIn(dto: LoginReqDto): Promise<AuthTokenResult> {
    const { email, password } = dto;
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password'],
    });

    const isPasswordValid =
      user && (await verifyPassword(password, user.password));

    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = new SessionEntity({
      hash,
      userId: user.id,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });
    await session.save();

    const scopes = await this.getUserScopeNames(user.id);

    const token = await this.createToken({
      id: user.id,
      sessionId: session.id,
      hash,
      scopes,
    });

    return {
      userId: user.id,
      ...token,
    };
  }

  async register(dto: RegisterReqDto): Promise<RegisterResDto> {
    // Check if the user already exists
    const isExistUser = await UserEntity.exists({
      where: { email: dto.email },
    });

    if (isExistUser) {
      throw new ValidationException(ErrorCode.E003);
    }

    // Register user
    const user = new UserEntity({
      email: dto.email,
      password: dto.password,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });

    await user.save();

    // Send email verification
    const token = await this.createVerificationToken({ id: user.id });
    const tokenExpiresIn = this.configService.getOrThrow(
      'auth.confirmEmailExpires',
      {
        infer: true,
      },
    );
    await this.cacheManager.set(
      createCacheKey(CacheKey.EMAIL_VERIFICATION, user.id),
      token,
      ms(tokenExpiresIn),
    );
    await this.emailQueue.add(
      JobName.EMAIL_VERIFICATION,
      {
        email: dto.email,
        token,
      } as IVerifyEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );

    return plainToInstance(RegisterResDto, {
      userId: user.id,
    });
  }

  async logout(userToken: JwtPayloadType): Promise<void> {
    await this.cacheManager.store.set<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, userToken.sessionId),
      true,
      userToken.exp * 1000 - Date.now(),
    );
    await SessionEntity.delete(userToken.sessionId);
  }

  /**
   * Refresh tokens using the refresh_token cookie value.
   * @param token Raw refresh JWT string from cookie
   * @returns AuthTokenResult (controller sets rotated cookie + strips refreshToken)
   */
  async refreshToken(token: string): Promise<AuthTokenResult> {
    const { sessionId, hash } = this.verifyRefreshToken(token);
    const session = await SessionEntity.findOneBy({ id: sessionId });

    if (!session || session.hash !== hash) {
      throw new UnauthorizedException();
    }

    // `findOne` rather than `findOneOrFail`: a soft-deleted or removed user is
    // an authentication failure (401), not a missing resource (404).
    const user = await this.userRepository.findOne({
      where: { id: session.userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // The refresh flow is the *only* place privileges are re-read: granting or
    // revoking a scope takes effect on the next refresh (<= access TTL, 15m).
    const scopes = await this.getUserScopeNames(user.id);

    const newHash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    await SessionEntity.update(session.id, { hash: newHash });

    const newToken = await this.createToken({
      id: user.id,
      sessionId: session.id,
      hash: newHash,
      scopes,
    });

    return {
      userId: user.id,
      ...newToken,
    };
  }

  async verifyAccessToken(token: string): Promise<JwtPayloadType> {
    let payload: JwtPayloadType;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException();
    }

    // Force logout if the session is in the blacklist
    const isSessionBlacklisted = await this.cacheManager.store.get<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, payload.sessionId),
    );

    if (isSessionBlacklisted) {
      throw new UnauthorizedException();
    }

    return payload;
  }

  private verifyRefreshToken(token: string): JwtRefreshPayloadType {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.refreshSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async createVerificationToken(data: { id: string }): Promise<string> {
    return await this.jwtService.signAsync(
      {
        id: data.id,
      },
      {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );
  }

  /**
   * Scope names owned by a user, read from the database.
   *
   * Single source of truth for both `signIn` and `refreshToken`. The array-form
   * `select` used elsewhere in this service cannot be combined with `relations`
   * in TypeORM 0.3, hence the object-form select here.
   */
  private async getUserScopeNames(userId: Uuid): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { scopes: true },
      select: { id: true, scopes: { id: true, name: true } },
    });

    return user?.scopes?.map((scope) => scope.name) ?? [];
  }

  private async createToken(data: {
    id: string;
    sessionId: string;
    hash: string;
    scopes: string[];
  }): Promise<Token> {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });
    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          id: data.id,
          sessionId: data.sessionId,
          scopes: data.scopes,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      tokenExpires,
    } as Token;
  }
}
