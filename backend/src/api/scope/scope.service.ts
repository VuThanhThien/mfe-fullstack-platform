import { MfeConfigEntity } from '@/api/mfe-config/entities/mfe-config.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ADMIN_SCOPE, SYSTEM_USER_ID } from '@/constants/app.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { paginate } from '@/utils/offset-pagination';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { plainToInstance } from 'class-transformer';
import { In, QueryFailedError, Repository } from 'typeorm';
import { CreateScopeReqDto } from './dto/create-scope.req.dto';
import { ListScopeReqDto } from './dto/list-scope.req.dto';
import { ScopeResDto } from './dto/scope.res.dto';
import { UpdateScopeReqDto } from './dto/update-scope.req.dto';
import { ScopeEntity } from './entities/scope.entity';

@Injectable()
export class ScopeService {
  private readonly logger = new Logger(ScopeService.name);

  constructor(
    @InjectRepository(ScopeEntity)
    private readonly scopeRepository: Repository<ScopeEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(MfeConfigEntity)
    private readonly mfeConfigRepository: Repository<MfeConfigEntity>,
  ) {}

  async create(dto: CreateScopeReqDto): Promise<ScopeResDto> {
    const scope = new ScopeEntity({
      name: dto.name,
      description: dto.description,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });

    // A duplicate name surfaces as a UQ_scope_name violation -> 409 via
    // GlobalExceptionFilter. No pre-check: it would be race-prone.
    return (await this.scopeRepository.save(scope)).toDto(ScopeResDto);
  }

  async findAll(
    reqDto: ListScopeReqDto,
  ): Promise<OffsetPaginatedDto<ScopeResDto>> {
    const query = this.scopeRepository
      .createQueryBuilder('scope')
      .orderBy('scope.name', 'ASC');
    const [scopes, metaDto] = await paginate<ScopeEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });

    return new OffsetPaginatedDto(
      plainToInstance(ScopeResDto, scopes),
      metaDto,
    );
  }

  async findOne(id: Uuid): Promise<ScopeResDto> {
    assert(id, 'id is required');
    const scope = await this.scopeRepository.findOneByOrFail({ id });

    return scope.toDto(ScopeResDto);
  }

  async update(id: Uuid, dto: UpdateScopeReqDto): Promise<ScopeResDto> {
    const scope = await this.scopeRepository.findOneByOrFail({ id });

    if (
      dto.name !== undefined &&
      dto.name !== scope.name &&
      scope.name === ADMIN_SCOPE
    ) {
      // Renaming ADMIN would silently move administrative rights to a new name.
      throw new ConflictException(`The ${ADMIN_SCOPE} scope cannot be renamed`);
    }

    if (dto.name !== undefined) scope.name = dto.name;
    if (dto.description !== undefined) scope.description = dto.description;
    scope.updatedBy = SYSTEM_USER_ID;

    return (await this.scopeRepository.save(scope)).toDto(ScopeResDto);
  }

  async remove(id: Uuid): Promise<void> {
    await this.scopeRepository.findOneByOrFail({ id });

    // The FK on `user_scope.scope_id` is RESTRICT, so this pre-check exists to
    // turn a would-be 500 into an explicit 409. Soft-deleted users are excluded
    // because `UserService.remove` revokes their grants when it soft-deletes
    // them — without that, their leftover rows would block deletion here and
    // the DELETE below would raise 23503.
    const userCount = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.scopes', 'scope', 'scope.id = :id', { id })
      .where('user.deletedAt IS NULL')
      .getCount();

    const mfeConfigCount = await this.mfeConfigRepository
      .createQueryBuilder('mfeConfig')
      .innerJoin('mfeConfig.scopes', 'scope', 'scope.id = :id', { id })
      .getCount();

    if (userCount + mfeConfigCount > 0) {
      this.logger.debug(
        `Refusing to delete scope ${id}: ${userCount} user(s), ${mfeConfigCount} mfe config(s)`,
      );
      throw new ConflictException({ errorCode: ErrorCode.E005 });
    }

    try {
      await this.scopeRepository.delete(id);
    } catch (error) {
      // Lost race: a grant was created between the pre-check and the delete.
      // The DB constraint is the source of truth — report the conflict rather
      // than leaking a 500.
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { driverError?: { code?: string } })
          .driverError?.code === '23503'
      ) {
        throw new ConflictException({ errorCode: ErrorCode.E005 });
      }
      throw error;
    }
  }

  /**
   * Resolves scope names to entities, rejecting unknown names with 400.
   *
   * Single place where "no implicit scope creation" is enforced (a typo'd
   * `ADMlN` must not invent a privilege), shared by the user and mfe-config
   * services.
   */
  async resolveByNames(names: string[]): Promise<ScopeEntity[]> {
    const unique = [...new Set(names)];
    if (!unique.length) return [];

    const scopes = await this.scopeRepository.find({
      where: { name: In(unique) },
    });

    if (scopes.length !== unique.length) {
      const found = new Set(scopes.map((scope) => scope.name));
      const missing = unique.filter((name) => !found.has(name));
      throw new ValidationException(
        ErrorCode.E006,
        `Unknown scopes: ${missing.join(', ')}`,
      );
    }

    return scopes;
  }
}
