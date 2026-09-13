import { MfeConfigEntity } from '@/api/mfe-config/entities/mfe-config.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Uuid } from '@/common/types/common.type';
import { ValidationException } from '@/exceptions/validation.exception';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, QueryFailedError } from 'typeorm';
import { ScopeEntity } from './entities/scope.entity';
import { ScopeService } from './scope.service';

describe('ScopeService', () => {
  let service: ScopeService;
  let scopeRepository: {
    find: jest.Mock;
    findOneByOrFail: jest.Mock;
    delete: jest.Mock;
    save: jest.Mock;
  };
  let userRepository: { createQueryBuilder: jest.Mock };
  let mfeConfigRepository: { createQueryBuilder: jest.Mock };

  const countBuilder = (count: number) => ({
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
  });

  beforeEach(async () => {
    scopeRepository = {
      find: jest.fn(),
      findOneByOrFail: jest.fn(),
      delete: jest.fn(),
      save: jest.fn(),
    };
    userRepository = { createQueryBuilder: jest.fn() };
    mfeConfigRepository = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopeService,
        { provide: getRepositoryToken(ScopeEntity), useValue: scopeRepository },
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        {
          provide: getRepositoryToken(MfeConfigEntity),
          useValue: mfeConfigRepository,
        },
      ],
    }).compile();

    service = module.get<ScopeService>(ScopeService);
  });

  describe('resolveByNames', () => {
    it('returns the scopes matching the given names', async () => {
      scopeRepository.find.mockResolvedValue([{ id: '1', name: 'ADMIN' }]);

      await expect(service.resolveByNames(['ADMIN'])).resolves.toEqual([
        { id: '1', name: 'ADMIN' },
      ]);
    });

    it('queries unique names only', async () => {
      scopeRepository.find.mockResolvedValue([{ name: 'ADMIN' }]);

      await service.resolveByNames(['ADMIN', 'ADMIN']);

      expect(scopeRepository.find).toHaveBeenCalledWith({
        where: { name: In(['ADMIN']) },
      });
    });

    it('throws a 400 ValidationException listing unknown names', async () => {
      scopeRepository.find.mockResolvedValue([{ name: 'ADMIN' }]);

      await expect(
        service.resolveByNames(['ADMIN', 'NOPE', 'ALSO_NOPE']),
      ).rejects.toThrow(ValidationException);
    });

    it('returns an empty list without querying when given no names', async () => {
      await expect(service.resolveByNames([])).resolves.toEqual([]);
      expect(scopeRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws 409 when a user still holds the scope', async () => {
      scopeRepository.findOneByOrFail.mockResolvedValue({
        id: '1',
        name: 'ADMIN',
      });
      userRepository.createQueryBuilder.mockReturnValue(countBuilder(1));
      mfeConfigRepository.createQueryBuilder.mockReturnValue(countBuilder(0));

      await expect(service.remove('1' as Uuid)).rejects.toThrow(
        ConflictException,
      );
      expect(scopeRepository.delete).not.toHaveBeenCalled();
    });

    it('throws 409 when an MFE config still uses the scope', async () => {
      scopeRepository.findOneByOrFail.mockResolvedValue({
        id: '1',
        name: 'DASHBOARD',
      });
      userRepository.createQueryBuilder.mockReturnValue(countBuilder(0));
      mfeConfigRepository.createQueryBuilder.mockReturnValue(countBuilder(2));

      await expect(service.remove('1' as Uuid)).rejects.toThrow(
        ConflictException,
      );
      expect(scopeRepository.delete).not.toHaveBeenCalled();
    });

    it('deletes a scope that nothing references', async () => {
      scopeRepository.findOneByOrFail.mockResolvedValue({
        id: '1',
        name: 'DASHBOARD',
      });
      userRepository.createQueryBuilder.mockReturnValue(countBuilder(0));
      mfeConfigRepository.createQueryBuilder.mockReturnValue(countBuilder(0));

      await service.remove('1' as Uuid);

      expect(scopeRepository.delete).toHaveBeenCalledWith('1');
    });

    it('maps a lost-race foreign-key violation to 409 instead of 500', async () => {
      scopeRepository.findOneByOrFail.mockResolvedValue({
        id: '1',
        name: 'DASHBOARD',
      });
      userRepository.createQueryBuilder.mockReturnValue(countBuilder(0));
      mfeConfigRepository.createQueryBuilder.mockReturnValue(countBuilder(0));
      // A grant appeared between the pre-check and the delete.
      scopeRepository.delete.mockRejectedValue(
        new QueryFailedError('DELETE', [], { code: '23503' } as never),
      );

      await expect(service.remove('1' as Uuid)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows non-foreign-key failures untouched', async () => {
      scopeRepository.findOneByOrFail.mockResolvedValue({
        id: '1',
        name: 'DASHBOARD',
      });
      userRepository.createQueryBuilder.mockReturnValue(countBuilder(0));
      mfeConfigRepository.createQueryBuilder.mockReturnValue(countBuilder(0));
      scopeRepository.delete.mockRejectedValue(
        new QueryFailedError('DELETE', [], { code: '57014' } as never),
      );

      await expect(service.remove('1' as Uuid)).rejects.toThrow(
        QueryFailedError,
      );
    });
  });
});
