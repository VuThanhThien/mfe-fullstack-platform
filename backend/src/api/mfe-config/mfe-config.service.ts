import { ScopeService } from '@/api/scope/scope.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { SYSTEM_USER_ID } from '@/constants/app.constant';
import { paginate } from '@/utils/offset-pagination';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { plainToInstance } from 'class-transformer';
import { In, Repository } from 'typeorm';
import { CreateMfeConfigReqDto } from './dto/create-mfe-config.req.dto';
import { ListMfeConfigReqDto } from './dto/list-mfe-config.req.dto';
import { MfeConfigResDto } from './dto/mfe-config.res.dto';
import { UpdateMfeConfigReqDto } from './dto/update-mfe-config.req.dto';
import { MfeConfigEntity } from './entities/mfe-config.entity';

@Injectable()
export class MfeConfigService {
  private readonly logger = new Logger(MfeConfigService.name);

  constructor(
    @InjectRepository(MfeConfigEntity)
    private readonly mfeConfigRepository: Repository<MfeConfigEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly scopeService: ScopeService,
  ) {}

  async create(dto: CreateMfeConfigReqDto): Promise<MfeConfigResDto> {
    const scopes = await this.scopeService.resolveByNames(dto.scopeNames);

    const entity = new MfeConfigEntity({
      remoteEntry: dto.remoteEntry,
      remoteName: dto.remoteName,
      exposedModule: dto.exposedModule,
      routeName: dto.routeName,
      title: dto.title,
      framework: dto.framework,
      iconUrl: dto.iconUrl,
      scopes,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });

    return (await this.mfeConfigRepository.save(entity)).toDto(MfeConfigResDto);
  }

  async findAll(
    reqDto: ListMfeConfigReqDto,
  ): Promise<OffsetPaginatedDto<MfeConfigResDto>> {
    // leftJoinAndSelect (not a filtered join): filtering the join by scope name
    // would truncate each config's `scopes` array to only the matching rows.
    const query = this.mfeConfigRepository
      .createQueryBuilder('mfeConfig')
      .leftJoinAndSelect('mfeConfig.scopes', 'scope')
      .orderBy('mfeConfig.createdAt', 'DESC');

    const [rows, metaDto] = await paginate<MfeConfigEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });

    return new OffsetPaginatedDto(
      plainToInstance(MfeConfigResDto, rows),
      metaDto,
    );
  }

  async findOne(id: Uuid): Promise<MfeConfigResDto> {
    assert(id, 'id is required');
    const config = await this.mfeConfigRepository.findOneOrFail({
      where: { id },
      relations: { scopes: true },
    });

    return config.toDto(MfeConfigResDto);
  }

  async update(id: Uuid, dto: UpdateMfeConfigReqDto): Promise<MfeConfigResDto> {
    const config = await this.mfeConfigRepository.findOneOrFail({
      where: { id },
      relations: { scopes: true },
    });

    // Presence checks only: omitting a field must leave it untouched.
    if (dto.remoteEntry !== undefined) config.remoteEntry = dto.remoteEntry;
    if (dto.remoteName !== undefined) config.remoteName = dto.remoteName;
    if (dto.exposedModule !== undefined)
      config.exposedModule = dto.exposedModule;
    if (dto.routeName !== undefined) config.routeName = dto.routeName;
    if (dto.title !== undefined) config.title = dto.title;
    if (dto.framework !== undefined) config.framework = dto.framework;
    if (dto.iconUrl !== undefined) config.iconUrl = dto.iconUrl;
    if (dto.scopeNames !== undefined) {
      // Full replacement of the granted set.
      config.scopes = await this.scopeService.resolveByNames(dto.scopeNames);
    }
    config.updatedBy = SYSTEM_USER_ID;

    return (await this.mfeConfigRepository.save(config)).toDto(MfeConfigResDto);
  }

  async remove(id: Uuid): Promise<void> {
    await this.mfeConfigRepository.findOneByOrFail({ id });
    await this.mfeConfigRepository.delete(id);
  }

  /**
   * Configs sharing **at least one** scope with the caller (ANY-overlap).
   *
   * Scopes are read from the database rather than the access token, so revoked
   * entitlements take effect immediately here even though the JWT can be up to
   * 15 minutes stale. `ADMIN` deliberately does **not** bypass the intersection:
   * the full registry is `GET /mfe-configs` (ADMIN only).
   */
  async findAccessible(userId: Uuid): Promise<MfeConfigResDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { scopes: true },
      select: { id: true, scopes: { id: true, name: true } },
    });

    const names = user?.scopes?.map((scope) => scope.name) ?? [];
    if (!names.length) return [];

    // Step 1: ids of configs that share >= 1 scope. groupBy collapses the row
    // fan-out a config would otherwise get from multiple matching scopes.
    const rows = await this.mfeConfigRepository
      .createQueryBuilder('mfeConfig')
      .select('mfeConfig.id', 'id')
      .innerJoin('mfeConfig.scopes', 'scope')
      .where('scope.name IN (:...names)', { names })
      .groupBy('mfeConfig.id')
      .getRawMany<{ id: Uuid }>();

    if (!rows.length) return [];

    // Step 2: hydrate full rows. `scopes` is intentionally not loaded, so the
    // response omits it (MfeConfigResDto.scopes is optional).
    const configs = await this.mfeConfigRepository.find({
      where: { id: In(rows.map((row) => row.id)) },
      order: { createdAt: 'DESC' },
    });

    return configs.map((config) => config.toDto(MfeConfigResDto));
  }
}
