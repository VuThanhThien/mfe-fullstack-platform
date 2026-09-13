import { ScopeService } from '@/api/scope/scope.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Uuid } from '@/common/types/common.type';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { MfeConfigEntity } from './entities/mfe-config.entity';
import { MfeConfigService } from './mfe-config.service';

describe('MfeConfigService', () => {
  let service: MfeConfigService;
  let mfeConfigRepository: {
    find: jest.Mock;
    findOneOrFail: jest.Mock;
    findOneByOrFail: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };
  let scopeService: { resolveByNames: jest.Mock };

  const entity = (data: Partial<MfeConfigEntity> = {}) =>
    new MfeConfigEntity({
      id: 'config-1' as Uuid,
      remoteEntry: 'http://localhost:3001/remoteEntry.js',
      remoteName: 'dashboard',
      exposedModule: './DashboardModule',
      routeName: 'dashboard',
      title: 'Dashboard',
      framework: 'react',
      createdBy: 'system',
      updatedBy: 'system',
      ...data,
    });

  beforeEach(async () => {
    mfeConfigRepository = {
      find: jest.fn(),
      findOneOrFail: jest.fn(),
      findOneByOrFail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    userRepository = { findOne: jest.fn() };
    scopeService = { resolveByNames: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfeConfigService,
        {
          provide: getRepositoryToken(MfeConfigEntity),
          useValue: mfeConfigRepository,
        },
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        { provide: ScopeService, useValue: scopeService },
      ],
    }).compile();

    service = module.get<MfeConfigService>(MfeConfigService);
  });

  describe('create', () => {
    it('resolves scope names and persists the config with new fields', async () => {
      const scopes = [{ id: 's1', name: 'DASHBOARD' }];
      scopeService.resolveByNames.mockResolvedValue(scopes);
      mfeConfigRepository.save.mockImplementation(async (value) => value);

      const result = await service.create({
        remoteEntry: 'http://localhost:3001/remoteEntry.js',
        remoteName: 'dashboard',
        exposedModule: './DashboardModule',
        routeName: 'dashboard',
        title: 'Dashboard',
        framework: 'react',
        scopeNames: ['DASHBOARD'],
      });

      expect(scopeService.resolveByNames).toHaveBeenCalledWith(['DASHBOARD']);
      expect(mfeConfigRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes,
          createdBy: 'system',
          routeName: 'dashboard',
          title: 'Dashboard',
          framework: 'react',
        }),
      );
      expect(result.remoteName).toBe('dashboard');
      expect(result.routeName).toBe('dashboard');
      expect(result.title).toBe('Dashboard');
      expect(result.framework).toBe('react');
    });
  });

  describe('update', () => {
    it('leaves scopes intact when scopeNames is omitted', async () => {
      const existingScopes = [{ id: 's1', name: 'DASHBOARD' }];
      const config = entity({ scopes: existingScopes as never });
      mfeConfigRepository.findOneOrFail.mockResolvedValue(config);
      mfeConfigRepository.save.mockImplementation(async (value) => value);

      await service.update('config-1' as Uuid, { remoteName: 'renamed' });

      expect(scopeService.resolveByNames).not.toHaveBeenCalled();
      expect(config.scopes).toBe(existingScopes);
      expect(config.remoteName).toBe('renamed');
    });

    it('replaces the whole scope set when scopeNames is present', async () => {
      const config = entity({ scopes: [{ id: 's1', name: 'OLD' }] as never });
      const replacement = [{ id: 's2', name: 'NEW' }];
      mfeConfigRepository.findOneOrFail.mockResolvedValue(config);
      mfeConfigRepository.save.mockImplementation(async (value) => value);
      scopeService.resolveByNames.mockResolvedValue(replacement);

      await service.update('config-1' as Uuid, { scopeNames: ['NEW'] });

      expect(config.scopes).toBe(replacement);
    });

    it('updates routeName, title, framework independently', async () => {
      const config = entity();
      mfeConfigRepository.findOneOrFail.mockResolvedValue(config);
      mfeConfigRepository.save.mockImplementation(async (value) => value);

      await service.update('config-1' as Uuid, {
        routeName: 'new-route',
        title: 'New Title',
        framework: 'vue',
      });

      expect(config.routeName).toBe('new-route');
      expect(config.title).toBe('New Title');
      expect(config.framework).toBe('vue');
    });
  });

  describe('findAccessible', () => {
    it('returns [] without querying when the user has no scopes', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'user-1', scopes: [] });

      await expect(service.findAccessible('user-1' as Uuid)).resolves.toEqual(
        [],
      );
      expect(mfeConfigRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns [] when the user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findAccessible('user-1' as Uuid)).resolves.toEqual(
        [],
      );
    });

    it('returns only configs sharing at least one scope', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        scopes: [{ id: 's1', name: 'DASHBOARD' }],
      });
      const rawBuilder = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ id: 'config-1' }]),
      };
      mfeConfigRepository.createQueryBuilder.mockReturnValue(rawBuilder);
      mfeConfigRepository.find.mockResolvedValue([entity()]);

      const result = await service.findAccessible('user-1' as Uuid);

      expect(rawBuilder.where).toHaveBeenCalledWith(
        'scope.name IN (:...names)',
        { names: ['DASHBOARD'] },
      );
      expect(mfeConfigRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: In(['config-1']) } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('config-1');
      // New fields must be present
      expect(result[0].routeName).toBe('dashboard');
      expect(result[0].title).toBe('Dashboard');
      expect(result[0].framework).toBe('react');
    });

    it('returns [] when no config matches', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        scopes: [{ id: 's1', name: 'DASHBOARD' }],
      });
      const rawBuilder = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mfeConfigRepository.createQueryBuilder.mockReturnValue(rawBuilder);

      await expect(service.findAccessible('user-1' as Uuid)).resolves.toEqual(
        [],
      );
      expect(mfeConfigRepository.find).not.toHaveBeenCalled();
    });
  });
});
