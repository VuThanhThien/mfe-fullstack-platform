import { getQueueToken } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BaseEntity, Repository } from 'typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { AuthService } from './auth.service';
import { LoginReqDto } from './dto/login.req.dto';

jest.mock('@/utils/password.util', () => ({
  verifyPassword: jest.fn().mockResolvedValue(true),
  hashPassword: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let configServiceValue: Partial<Record<keyof ConfigService, jest.Mock>>;
  let jwtServiceValue: Partial<Record<keyof JwtService, jest.Mock>>;
  let userRepositoryValue: Partial<
    Record<keyof Repository<UserEntity>, jest.Mock>
  >;

  beforeAll(async () => {
    configServiceValue = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };

    jwtServiceValue = {
      sign: jest.fn(),
      signAsync: jest.fn(),
      verify: jest.fn(),
    };

    userRepositoryValue = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: configServiceValue,
        },
        {
          provide: JwtService,
          useValue: jwtServiceValue,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepositoryValue,
        },
        {
          provide: getQueueToken('email'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    configServiceValue.getOrThrow!.mockReturnValue('15m');
    jest
      .spyOn(BaseEntity.prototype, 'save')
      .mockResolvedValue(undefined as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    it('signs the access token with the scope names loaded from the database', async () => {
      userRepositoryValue
        .findOne!.mockResolvedValueOnce({
          id: 'user-1',
          email: 'admin@example.com',
          password: 'hashed',
        })
        .mockResolvedValueOnce({
          id: 'user-1',
          scopes: [{ id: 'scope-1', name: 'ADMIN' }],
        });
      jwtServiceValue.signAsync!.mockResolvedValue('signed-token');

      await service.signIn({
        email: 'admin@example.com',
        password: '12345678',
      } as LoginReqDto);

      // Second lookup is the scope load, and it must request the relation.
      expect(userRepositoryValue.findOne).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          relations: { scopes: true },
          select: { id: true, scopes: { id: true, name: true } },
        }),
      );

      const accessPayload = jwtServiceValue.signAsync!.mock.calls[0][0];
      expect(accessPayload).toEqual({
        id: 'user-1',
        sessionId: undefined,
        scopes: ['ADMIN'],
      });
      expect(accessPayload).not.toHaveProperty('role');
    });

    it('signs an empty scope list for a user without scopes', async () => {
      userRepositoryValue
        .findOne!.mockResolvedValueOnce({
          id: 'user-2',
          email: 'plain@example.com',
          password: 'hashed',
        })
        .mockResolvedValueOnce({ id: 'user-2', scopes: [] });
      jwtServiceValue.signAsync!.mockResolvedValue('signed-token');

      await service.signIn({
        email: 'plain@example.com',
        password: '12345678',
      } as LoginReqDto);

      expect(jwtServiceValue.signAsync!.mock.calls[0][0]).toEqual({
        id: 'user-2',
        sessionId: undefined,
        scopes: [],
      });
    });
  });
});
