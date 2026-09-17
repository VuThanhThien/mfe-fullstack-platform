import { ScopeService } from '@/api/scope/scope.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Uuid } from '@/common/types/common.type';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MfeConfigEntity } from './entities/mfe-config.entity';
import { MfeNavItemEntity } from './entities/mfe-nav-item.entity';
import { MfeNavItemType } from './mfe-nav-item.constants';
import { MfeNavItemService } from './mfe-nav-item.service';

describe('MfeNavItemService', () => {
  let service: MfeNavItemService;
  let navItemRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let mfeConfigRepository: {
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };
  let scopeService: { resolveByNames: jest.Mock };

  const configId = 'config-1' as Uuid;
  const userId = 'user-1' as Uuid;
  const dashboardScope = { id: 's-dash', name: 'DASHBOARD' };
  const adminScope = { id: 's-admin', name: 'ADMIN' };

  const config = (scopes = [dashboardScope]) =>
    ({
      id: configId,
      routeName: 'product',
      scopes,
    }) as MfeConfigEntity;

  const nav = (data: Partial<MfeNavItemEntity> = {}) =>
    new MfeNavItemEntity({
      id: 'nav-1' as Uuid,
      mfeConfigId: configId,
      parentId: null,
      type: MfeNavItemType.Route,
      title: 'List',
      path: 'list',
      sortOrder: 0,
      scopes: [dashboardScope] as never,
      createdBy: 'system',
      updatedBy: 'system',
      ...data,
    });

  beforeEach(async () => {
    navItemRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      manager: {
        transaction: jest.fn(async (cb: (em: unknown) => Promise<unknown>) =>
          cb({ getRepository: () => navItemRepository }),
        ),
      },
    };
    mfeConfigRepository = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
    };
    userRepository = { findOne: jest.fn() };
    scopeService = { resolveByNames: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfeNavItemService,
        {
          provide: getRepositoryToken(MfeNavItemEntity),
          useValue: navItemRepository,
        },
        {
          provide: getRepositoryToken(MfeConfigEntity),
          useValue: mfeConfigRepository,
        },
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        { provide: ScopeService, useValue: scopeService },
      ],
    }).compile();

    service = module.get(MfeNavItemService);
  });

  describe('findNavAccessible', () => {
    it('404s when the config does not exist', async () => {
      mfeConfigRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findNavAccessible(userId, 'missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('404s when the user has no overlap with the config scopes (no ADMIN bypass)', async () => {
      mfeConfigRepository.findOne.mockResolvedValue(config([dashboardScope]));
      userRepository.findOne.mockResolvedValue({
        id: userId,
        scopes: [adminScope],
      });

      await expect(
        service.findNavAccessible(userId, 'product'),
      ).rejects.toThrow(NotFoundException);
      expect(navItemRepository.find).not.toHaveBeenCalled();
    });

    it('returns the filtered tree for a user with overlap', async () => {
      mfeConfigRepository.findOne.mockResolvedValue(config([dashboardScope]));
      userRepository.findOne.mockResolvedValue({
        id: userId,
        scopes: [dashboardScope],
      });
      navItemRepository.find.mockResolvedValue([
        nav({
          id: 'g1' as Uuid,
          type: MfeNavItemType.Group,
          title: 'Catalog',
          path: null,
        }),
        nav({
          id: 'r1' as Uuid,
          title: 'List',
          path: 'list',
          parentId: 'g1' as Uuid,
        }),
        nav({
          id: 'r2' as Uuid,
          title: 'Import',
          path: 'import',
          parentId: 'g1' as Uuid,
          scopes: [adminScope] as never,
        }),
      ]);

      const result = await service.findNavAccessible(userId, 'product');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Catalog');
      expect(result[0].children.map((c) => c.title)).toEqual(['List']);
      expect(result[0]).not.toHaveProperty('scopeNames');
    });
  });

  describe('create', () => {
    it('persists a route node with resolved scopes', async () => {
      mfeConfigRepository.findOneOrFail.mockResolvedValue(config());
      navItemRepository.find.mockResolvedValue([]);
      navItemRepository.findOne.mockResolvedValue(null);
      scopeService.resolveByNames.mockResolvedValue([dashboardScope]);
      navItemRepository.save.mockImplementation(async (value) =>
        Object.assign(new MfeNavItemEntity(), value, { id: 'nav-new' }),
      );

      const result = await service.create(configId, {
        type: MfeNavItemType.Route,
        title: 'List',
        path: 'list',
        scopeNames: ['DASHBOARD'],
      });

      expect(scopeService.resolveByNames).toHaveBeenCalledWith(['DASHBOARD']);
      expect(navItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MfeNavItemType.Route,
          path: 'list',
          mfeConfigId: configId,
        }),
      );
      expect(result.title).toBe('List');
      expect(result.children).toEqual([]);
    });

    it('rejects a group that carries a path', async () => {
      mfeConfigRepository.findOneOrFail.mockResolvedValue(config());
      navItemRepository.find.mockResolvedValue([]);

      await expect(
        service.create(configId, {
          type: MfeNavItemType.Group,
          title: 'Catalog',
          path: 'nope',
          scopeNames: ['DASHBOARD'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a route node as parent', async () => {
      const leaf = nav({ id: 'leaf' as Uuid, title: 'Leaf', path: 'leaf' });
      mfeConfigRepository.findOneOrFail.mockResolvedValue(config());
      navItemRepository.find.mockResolvedValue([leaf]);

      await expect(
        service.create(configId, {
          type: MfeNavItemType.Route,
          title: 'Child',
          path: 'child',
          parentId: 'leaf',
          scopeNames: ['DASHBOARD'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('replaces scopes when scopeNames is present', async () => {
      const existing = nav();
      mfeConfigRepository.findOneOrFail.mockResolvedValue(config());
      navItemRepository.find.mockResolvedValue([existing]);
      navItemRepository.findOne.mockResolvedValue(null);
      scopeService.resolveByNames.mockResolvedValue([adminScope]);
      navItemRepository.save.mockImplementation(async (value) => value);

      await service.update(configId, existing.id, { scopeNames: ['ADMIN'] });

      expect(existing.scopes).toEqual([adminScope]);
    });

    it('rejects a parent that would cycle', async () => {
      const parent = nav({ id: 'p1' as Uuid, title: 'Parent', path: 'p' });
      const child = nav({
        id: 'c1' as Uuid,
        title: 'Child',
        path: 'c',
        parentId: 'p1' as Uuid,
      });
      mfeConfigRepository.findOneOrFail.mockResolvedValue(config());
      navItemRepository.find.mockResolvedValue([parent, child]);

      await expect(
        service.update(configId, 'p1' as Uuid, { parentId: 'c1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('404s when the item is not in the config', async () => {
      mfeConfigRepository.findOneOrFail.mockResolvedValue(config());
      navItemRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(configId, 'missing' as Uuid)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes an item that belongs to the config', async () => {
      mfeConfigRepository.findOneOrFail.mockResolvedValue(config());
      navItemRepository.findOne.mockResolvedValue(nav());

      await service.remove(configId, 'nav-1' as Uuid);

      expect(navItemRepository.delete).toHaveBeenCalledWith('nav-1');
    });
  });
});
