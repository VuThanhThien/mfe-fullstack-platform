import { ScopeService } from '@/api/scope/scope.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Uuid } from '@/common/types/common.type';
import { SYSTEM_USER_ID } from '@/constants/app.constant';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { IsNull, Repository } from 'typeorm';
import { CreateMfeNavItemReqDto } from './dto/create-mfe-nav-item.req.dto';
import { MfeNavItemResDto } from './dto/mfe-nav-item.res.dto';
import { MfeNavNodeResDto } from './dto/mfe-nav-node.res.dto';
import { ReorderMfeNavItemsReqDto } from './dto/reorder-mfe-nav-items.req.dto';
import { UpdateMfeNavItemReqDto } from './dto/update-mfe-nav-item.req.dto';
import { MfeConfigEntity } from './entities/mfe-config.entity';
import { MfeNavItemEntity } from './entities/mfe-nav-item.entity';
import {
  isValidNavRoutePath,
  MFE_NAV_MAX_DEPTH,
  MFE_NAV_PATH_PATTERN_MESSAGE,
  MfeNavItemType,
} from './mfe-nav-item.constants';
import {
  buildAdminNavTree,
  depthIfParent,
  filterAccessibleNavTree,
  graphHasCycle,
  hasScopeOverlap,
  subtreeHeight,
  type NavItemForTree,
} from './mfe-nav-tree.util';

@Injectable()
export class MfeNavItemService {
  constructor(
    @InjectRepository(MfeNavItemEntity)
    private readonly navItemRepository: Repository<MfeNavItemEntity>,
    @InjectRepository(MfeConfigEntity)
    private readonly mfeConfigRepository: Repository<MfeConfigEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * Filtered forest for the shell drawer. 404 if the config is missing **or**
   * not in the caller's accessible set (no existence leak, no ADMIN bypass).
   */
  async findNavAccessible(
    userId: Uuid,
    routeName: string,
  ): Promise<MfeNavNodeResDto[]> {
    const config = await this.mfeConfigRepository.findOne({
      where: { routeName },
      relations: { scopes: true },
    });
    if (!config) {
      throw new NotFoundException();
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { scopes: true },
      select: { id: true, scopes: { id: true, name: true } },
    });
    const userNames = user?.scopes?.map((scope) => scope.name) ?? [];
    const configNames = config.scopes?.map((scope) => scope.name) ?? [];
    if (!hasScopeOverlap(userNames, configNames)) {
      throw new NotFoundException();
    }

    const items = await this.navItemRepository.find({
      where: { mfeConfigId: config.id },
      relations: { scopes: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return filterAccessibleNavTree(items, userNames).map((node) =>
      this.toAccessibleDto(node),
    );
  }

  async findAllForAdmin(configId: Uuid): Promise<MfeNavItemResDto[]> {
    await this.requireConfig(configId);
    const items = await this.loadTree(configId);
    return buildAdminNavTree(items).map((node) => this.toAdminDto(node));
  }

  async create(
    configId: Uuid,
    dto: CreateMfeNavItemReqDto,
  ): Promise<MfeNavItemResDto> {
    await this.requireConfig(configId);
    this.assertPathForType(dto.type, dto.path ?? null);

    const items = await this.loadTree(configId);
    const parentId = (dto.parentId as Uuid | undefined) ?? null;
    this.assertParentInConfig(parentId, items, configId);
    this.assertAcyclicAndDepth({
      items,
      nodeId: null,
      parentId,
    });
    await this.assertUniqueSiblingPath(
      configId,
      parentId,
      dto.type,
      dto.path ?? null,
    );

    const scopes = await this.scopeService.resolveByNames(dto.scopeNames);
    const entity = new MfeNavItemEntity({
      mfeConfigId: configId,
      parentId,
      type: dto.type,
      title: dto.title,
      path: dto.type === MfeNavItemType.Route ? (dto.path ?? null) : null,
      iconUrl: dto.iconUrl ?? null,
      sortOrder: dto.sortOrder ?? 0,
      scopes,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });

    const saved = await this.navItemRepository.save(entity);
    return this.toAdminDto({ ...saved, children: [] });
  }

  async update(
    configId: Uuid,
    itemId: Uuid,
    dto: UpdateMfeNavItemReqDto,
  ): Promise<MfeNavItemResDto> {
    await this.requireConfig(configId);
    const items = await this.loadTree(configId);
    const item = items.find((row) => row.id === itemId);
    if (!item) {
      throw new NotFoundException();
    }

    const nextType = dto.type ?? item.type;
    const nextPath =
      dto.path !== undefined ? (dto.path ?? null) : (item.path ?? null);
    this.assertPathForType(nextType, nextPath);

    const nextParentId =
      dto.parentId !== undefined
        ? ((dto.parentId as Uuid | null) ?? null)
        : (item.parentId ?? null);
    this.assertParentInConfig(nextParentId, items, configId, itemId);
    this.assertAcyclicAndDepth({
      items,
      nodeId: itemId,
      parentId: nextParentId,
    });
    await this.assertUniqueSiblingPath(
      configId,
      nextParentId,
      nextType,
      nextPath,
      itemId,
    );

    if (dto.title !== undefined) item.title = dto.title;
    if (dto.iconUrl !== undefined) item.iconUrl = dto.iconUrl ?? null;
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
    item.type = nextType;
    item.path = nextType === MfeNavItemType.Route ? nextPath : null;
    item.parentId = nextParentId;
    if (dto.scopeNames !== undefined) {
      item.scopes = await this.scopeService.resolveByNames(dto.scopeNames);
    }
    item.updatedBy = SYSTEM_USER_ID;

    const saved = await this.navItemRepository.save(item);
    return this.toAdminDto({ ...saved, children: [] });
  }

  async remove(configId: Uuid, itemId: Uuid): Promise<void> {
    await this.requireConfig(configId);
    const item = await this.navItemRepository.findOne({
      where: { id: itemId, mfeConfigId: configId },
    });
    if (!item) {
      throw new NotFoundException();
    }
    await this.navItemRepository.delete(itemId);
  }

  async reorder(
    configId: Uuid,
    dto: ReorderMfeNavItemsReqDto,
  ): Promise<MfeNavItemResDto[]> {
    await this.requireConfig(configId);
    const items = await this.loadTree(configId);
    const byId = new Map(items.map((item) => [item.id, item]));

    for (const patch of dto.items) {
      const item = byId.get(patch.id as Uuid);
      if (!item) {
        throw new NotFoundException();
      }
      const parentId = (patch.parentId as Uuid | null | undefined) ?? null;
      this.assertParentInConfig(parentId, items, configId, item.id);
      item.parentId = parentId;
      item.sortOrder = patch.sortOrder;
      item.updatedBy = SYSTEM_USER_ID;
    }

    const proposed = [...byId.values()].map((item) => ({
      id: item.id,
      parentId: item.parentId ?? null,
    }));
    if (graphHasCycle(proposed)) {
      throw new BadRequestException('Nav parent would create a cycle');
    }
    this.assertForestDepth(items);

    await this.navItemRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(MfeNavItemEntity);
      for (const patch of dto.items) {
        const item = byId.get(patch.id as Uuid)!;
        await repo.save(item);
      }
    });

    const reloaded = await this.loadTree(configId);
    return buildAdminNavTree(reloaded).map((node) => this.toAdminDto(node));
  }

  private async requireConfig(configId: Uuid): Promise<MfeConfigEntity> {
    return await this.mfeConfigRepository.findOneOrFail({
      where: { id: configId },
    });
  }

  private async loadTree(configId: Uuid): Promise<MfeNavItemEntity[]> {
    return await this.navItemRepository.find({
      where: { mfeConfigId: configId },
      relations: { scopes: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  private assertPathForType(type: MfeNavItemType, path: string | null): void {
    if (type === MfeNavItemType.Route) {
      if (path == null || !isValidNavRoutePath(path)) {
        throw new BadRequestException(`path ${MFE_NAV_PATH_PATTERN_MESSAGE}`);
      }
      return;
    }
    if (path) {
      throw new BadRequestException('group nodes must not have a path');
    }
  }

  private assertParentInConfig(
    parentId: Uuid | null,
    items: MfeNavItemEntity[],
    configId: Uuid,
    selfId?: Uuid,
  ): void {
    if (!parentId) return;
    if (selfId && parentId === selfId) {
      throw new BadRequestException('Nav parent would create a cycle');
    }
    const parent = items.find((item) => item.id === parentId);
    if (!parent || parent.mfeConfigId !== configId) {
      throw new NotFoundException();
    }
    if (parent.type !== MfeNavItemType.Group) {
      throw new BadRequestException('Nav parent must be a group');
    }
  }

  private assertAcyclicAndDepth(args: {
    items: MfeNavItemEntity[];
    nodeId: Uuid | null;
    parentId: Uuid | null;
  }): void {
    const { items, nodeId, parentId } = args;
    const byId = new Map(
      items.map((item) => [item.id, { parentId: item.parentId ?? null }]),
    );
    if (nodeId) {
      byId.set(nodeId, { parentId });
      const proposed = items.map((item) => ({
        id: item.id,
        parentId: item.id === nodeId ? parentId : (item.parentId ?? null),
      }));
      if (graphHasCycle(proposed)) {
        throw new BadRequestException('Nav parent would create a cycle');
      }
    }

    let depth: number;
    try {
      depth = depthIfParent(parentId, byId);
    } catch {
      throw new BadRequestException('Nav parent would create a cycle');
    }

    const childrenByParent = new Map<Uuid | null, { id: Uuid }[]>();
    for (const item of items) {
      const p =
        item.id === nodeId
          ? parentId
          : ((item.parentId ?? null) as Uuid | null);
      const list = childrenByParent.get(p) ?? [];
      list.push({ id: item.id });
      childrenByParent.set(p, list);
    }

    const height = nodeId ? subtreeHeight(nodeId, childrenByParent) : 1;
    if (depth + height - 1 > MFE_NAV_MAX_DEPTH) {
      throw new BadRequestException(
        `Nav tree depth cannot exceed ${MFE_NAV_MAX_DEPTH}`,
      );
    }
  }

  private assertForestDepth(items: MfeNavItemEntity[]): void {
    const byId = new Map(
      items.map((item) => [item.id, { parentId: item.parentId ?? null }]),
    );
    for (const item of items) {
      let depth: number;
      try {
        depth = depthIfParent(item.parentId ?? null, byId);
      } catch {
        throw new BadRequestException('Nav parent would create a cycle');
      }
      if (depth > MFE_NAV_MAX_DEPTH) {
        throw new BadRequestException(
          `Nav tree depth cannot exceed ${MFE_NAV_MAX_DEPTH}`,
        );
      }
    }
  }

  private async assertUniqueSiblingPath(
    configId: Uuid,
    parentId: Uuid | null,
    type: MfeNavItemType,
    path: string | null,
    excludeId?: Uuid,
  ): Promise<void> {
    if (type !== MfeNavItemType.Route || path == null) return;

    const sibling = await this.navItemRepository.findOne({
      where: {
        mfeConfigId: configId,
        parentId: parentId ?? IsNull(),
        path,
        type: MfeNavItemType.Route,
      },
    });
    if (sibling && sibling.id !== excludeId) {
      throw new ConflictException(
        'A sibling route with this path already exists',
      );
    }
  }

  private toAccessibleDto(
    node: NavItemForTree & { children: NavItemForTree[] },
  ): MfeNavNodeResDto {
    return plainToInstance(MfeNavNodeResDto, {
      id: node.id,
      type: node.type,
      title: node.title,
      path: node.path ?? undefined,
      iconUrl: node.iconUrl ?? undefined,
      children: (node.children ?? []).map((child) =>
        this.toAccessibleDto(
          child as NavItemForTree & { children: NavItemForTree[] },
        ),
      ),
    });
  }

  private toAdminDto(
    node: NavItemForTree & {
      children?: NavItemForTree[];
      scopes?: { name: string }[];
    },
  ): MfeNavItemResDto {
    return plainToInstance(MfeNavItemResDto, {
      id: node.id,
      type: node.type,
      title: node.title,
      path: node.path ?? undefined,
      iconUrl: node.iconUrl ?? undefined,
      parentId: node.parentId ?? null,
      sortOrder: node.sortOrder,
      scopeNames: (node.scopes ?? []).map((scope) => scope.name),
      children: (node.children ?? []).map((child) =>
        this.toAdminDto(
          child as NavItemForTree & { children?: NavItemForTree[] },
        ),
      ),
    });
  }
}
