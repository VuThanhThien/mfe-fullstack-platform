import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { SYSTEM_USER_ID } from '@/constants/app.constant';
import { CacheKey } from '@/constants/cache.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { createCacheKey } from '@/utils/cache.util';
import { buildPaginator } from '@/utils/cursor-pagination';
import { paginate } from '@/utils/offset-pagination';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import ms from 'ms';
import { Repository } from 'typeorm';
import { ScopeService } from '../scope/scope.service';
import { CreateUserReqDto } from './dto/create-user.req.dto';
import { ListUserReqDto } from './dto/list-user.req.dto';
import { LoadMoreUsersReqDto } from './dto/load-more-users.req.dto';
import { UpdateUserReqDto } from './dto/update-user.req.dto';
import { UserResDto } from './dto/user.res.dto';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    private readonly scopeService: ScopeService,
    private readonly configService: ConfigService<AllConfigType>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async create(dto: CreateUserReqDto): Promise<UserResDto> {
    const { username, email, password, bio, image, scopeNames } = dto;

    // check uniqueness of username/email
    const user = await this.userRepository.findOne({
      where: [
        {
          username,
        },
        {
          email,
        },
      ],
    });

    if (user) {
      throw new ValidationException(ErrorCode.E001);
    }

    // Unknown scope names -> 400. Scopes are never created implicitly here.
    const scopes = scopeNames
      ? await this.scopeService.resolveByNames(scopeNames)
      : undefined;

    // `save()` on a *new* entity is correct: @BeforeInsert hashes the plaintext
    // password exactly once.
    const newUser = new UserEntity({
      username,
      email,
      password,
      bio,
      image,
      ...(scopes ? { scopes } : {}),
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });

    const savedUser = await this.userRepository.save(newUser);
    this.logger.debug(savedUser);

    return plainToInstance(UserResDto, savedUser);
  }

  async findAll(
    reqDto: ListUserReqDto,
  ): Promise<OffsetPaginatedDto<UserResDto>> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');
    const [users, metaDto] = await paginate<UserEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });
    return new OffsetPaginatedDto(plainToInstance(UserResDto, users), metaDto);
  }

  async loadMoreUsers(
    reqDto: LoadMoreUsersReqDto,
  ): Promise<CursorPaginatedDto<UserResDto>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    const paginator = buildPaginator({
      entity: UserEntity,
      alias: 'user',
      paginationKeys: ['createdAt'],
      query: {
        limit: reqDto.limit,
        order: 'DESC',
        afterCursor: reqDto.afterCursor,
        beforeCursor: reqDto.beforeCursor,
      },
    });

    const { data, cursor } = await paginator.paginate(queryBuilder);

    const metaDto = new CursorPaginationDto(
      data.length,
      cursor.afterCursor,
      cursor.beforeCursor,
      reqDto,
    );

    return new CursorPaginatedDto(plainToInstance(UserResDto, data), metaDto);
  }

  async findOne(id: Uuid): Promise<UserResDto> {
    assert(id, 'id is required');
    const user = await this.userRepository.findOneOrFail({
      where: { id },
      relations: { scopes: true },
    });

    return user.toDto(UserResDto);
  }

  async update(id: Uuid, updateUserDto: UpdateUserReqDto): Promise<UserResDto> {
    const user = await this.userRepository.findOneOrFail({
      where: { id },
      relations: { scopes: true },
    });

    if (updateUserDto.scopeNames !== undefined) {
      // Full replacement of the granted set.
      const desired = await this.scopeService.resolveByNames(
        updateUserDto.scopeNames,
      );
      const desiredIds = new Set(desired.map((scope) => scope.id));
      const currentIds = new Set((user.scopes ?? []).map((scope) => scope.id));

      const toAdd = desired.filter((scope) => !currentIds.has(scope.id));
      const toRemove = (user.scopes ?? []).filter(
        (scope) => !desiredIds.has(scope.id),
      );

      if (toAdd.length || toRemove.length) {
        await this.userRepository
          .createQueryBuilder()
          .relation(UserEntity, 'scopes')
          .of(id)
          .addAndRemove(toAdd, toRemove);
      }
    }

    // Deliberately a direct column update rather than `save()`: the loaded row
    // holds the *already hashed* password, and `save()` would re-run
    // @BeforeUpdate hashPassword() over that hash, permanently breaking the
    // user's ability to log in. Only fields present in the payload are touched.
    const scalars: Partial<UserEntity> = { updatedBy: SYSTEM_USER_ID };
    if (updateUserDto.bio !== undefined) scalars.bio = updateUserDto.bio;
    if (updateUserDto.image !== undefined) scalars.image = updateUserDto.image;

    await this.userRepository.update(id, scalars);

    return this.findOne(id);
  }

  async remove(id: Uuid): Promise<void> {
    const user = await this.userRepository.findOneOrFail({
      where: { id },
      relations: { scopes: true },
    });

    // Revoke entitlements. A deleted user must not keep its scopes, and a
    // dangling grant would leave the scope row undeletable because the
    // `user_scope.scope_id` FK is RESTRICT (ScopeService then answers 409).
    if (user.scopes?.length) {
      await this.userRepository
        .createQueryBuilder()
        .relation(UserEntity, 'scopes')
        .of(id)
        .remove(user.scopes);
    }

    // Drop the sessions *and* blacklist them, so existing access tokens stop
    // working immediately rather than lingering until they expire (<= 15m).
    // Mirrors AuthService.logout(), the documented instant-revocation path.
    const sessions = await this.sessionRepository.find({
      where: { userId: id },
    });

    if (sessions.length) {
      const accessTtlMs = Number(
        ms(this.configService.getOrThrow('auth.expires', { infer: true })),
      );
      await Promise.all(
        sessions.map((session) =>
          this.cacheManager.store.set<boolean>(
            createCacheKey(CacheKey.SESSION_BLACKLIST, session.id),
            true,
            accessTtlMs,
          ),
        ),
      );
      await this.sessionRepository.delete({ userId: id });
    }

    await this.userRepository.softDelete(id);
  }
}
