import { Uuid } from '@/common/types/common.type';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScopeService } from '../scope/scope.service';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let userRepositoryValue: {
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
    softDelete: jest.Mock;
  };
  let sessionRepositoryValue: { find: jest.Mock; delete: jest.Mock };
  let cacheManagerValue: { store: { set: jest.Mock } };

  beforeEach(async () => {
    userRepositoryValue = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    sessionRepositoryValue = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    cacheManagerValue = { store: { set: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepositoryValue,
        },
        {
          provide: getRepositoryToken(SessionEntity),
          useValue: sessionRepositoryValue,
        },
        {
          provide: ScopeService,
          useValue: {
            resolveByNames: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('15m') },
        },
        { provide: CACHE_MANAGER, useValue: cacheManagerValue },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    const existingUser = () =>
      new UserEntity({
        id: 'user-1' as Uuid,
        bio: 'old',
        image: 'image.png',
        scopes: [],
      });

    it('writes scalars with update(), never save()', async () => {
      userRepositoryValue.findOneOrFail.mockResolvedValue(existingUser());

      await service.update('user-1' as Uuid, { bio: 'new' });

      expect(userRepositoryValue.update).toHaveBeenCalledWith('user-1', {
        bio: 'new',
        updatedBy: 'system',
      });
      // Regression guard: save() re-runs @BeforeUpdate hashPassword() over the
      // already-hashed password and permanently breaks the user's login.
      expect(userRepositoryValue.save).not.toHaveBeenCalled();
    });

    it('leaves omitted scalars out of the update payload', async () => {
      userRepositoryValue.findOneOrFail.mockResolvedValue(existingUser());

      await service.update('user-1' as Uuid, {});

      expect(userRepositoryValue.update).toHaveBeenCalledWith('user-1', {
        updatedBy: 'system',
      });
    });
  });

  describe('remove', () => {
    it('revokes grants, blacklists sessions and soft-deletes the user', async () => {
      const scope = { id: 'scope-1' };
      userRepositoryValue.findOneOrFail.mockResolvedValue(
        new UserEntity({ id: 'user-1' as Uuid, scopes: [scope] as never }),
      );
      sessionRepositoryValue.find.mockResolvedValue([{ id: 'session-1' }]);

      const relation = {
        of: jest.fn().mockReturnThis(),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      userRepositoryValue.createQueryBuilder.mockReturnValue({
        relation: jest.fn().mockReturnValue(relation),
      });

      await service.remove('user-1' as Uuid);

      // Grants are revoked so the scope row is no longer RESTRICTed.
      expect(relation.remove).toHaveBeenCalledWith([scope]);
      // The session is blacklisted so the access token dies immediately.
      expect(cacheManagerValue.store.set).toHaveBeenCalledWith(
        'auth:session-blacklist:session-1',
        true,
        900000,
      );
      expect(sessionRepositoryValue.delete).toHaveBeenCalledWith({
        userId: 'user-1',
      });
      expect(userRepositoryValue.softDelete).toHaveBeenCalledWith('user-1');
    });
  });
});
