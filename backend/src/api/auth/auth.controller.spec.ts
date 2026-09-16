import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceValue: Partial<Record<keyof AuthService, jest.Mock>>;
  let configGet: jest.Mock;
  let configGetOrThrow: jest.Mock;

  const tokenResult = {
    userId: 'user-1',
    accessToken: 'access',
    refreshToken: 'refresh',
    tokenExpires: 123,
  };

  async function buildController() {
    authServiceValue = {
      signIn: jest.fn().mockResolvedValue(tokenResult),
      register: jest.fn(),
      logout: jest.fn().mockResolvedValue(undefined),
      refreshToken: jest.fn().mockResolvedValue(tokenResult),
    };

    configGet = jest.fn((key: string) => {
      if (key === 'app.nodeEnv') return 'development';
      if (key === 'auth.cookieDomain') return undefined;
      return undefined;
    });
    configGetOrThrow = jest.fn((key: string) => {
      if (key === 'auth.refreshExpires') return '7d';
      throw new Error(`unexpected getOrThrow: ${key}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceValue,
        },
        {
          provide: ConfigService,
          useValue: {
            get: configGet,
            getOrThrow: configGetOrThrow,
          },
        },
      ],
    }).compile();

    return module.get<AuthController>(AuthController);
  }

  beforeAll(async () => {
    controller = await buildController();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authServiceValue.signIn!.mockResolvedValue(tokenResult);
    authServiceValue.logout!.mockResolvedValue(undefined);
    authServiceValue.refreshToken!.mockResolvedValue(tokenResult);
    configGet.mockImplementation((key: string) => {
      if (key === 'app.nodeEnv') return 'development';
      if (key === 'auth.cookieDomain') return undefined;
      return undefined;
    });
    configGetOrThrow.mockImplementation((key: string) => {
      if (key === 'auth.refreshExpires') return '7d';
      throw new Error(`unexpected getOrThrow: ${key}`);
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('refresh cookie options', () => {
    function mockRes() {
      return {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
      };
    }

    it('omits domain when COOKIE_DOMAIN is unset', async () => {
      const res = mockRes();
      await controller.signIn(
        { email: 'a@b.com', password: 'x' } as never,
        res as unknown as Response,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh',
        expect.not.objectContaining({ domain: expect.anything() }),
      );
      const opts = (res.cookie.mock.calls[0] as unknown[])[2] as Record<
        string,
        unknown
      >;
      expect(opts).not.toHaveProperty('domain');
      expect(opts.httpOnly).toBe(true);
      expect(opts.path).toBe('/');
      expect(opts.sameSite).toBe('lax');
    });

    it('sets domain when COOKIE_DOMAIN is configured', async () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'app.nodeEnv') return 'development';
        if (key === 'auth.cookieDomain') return '.example.com';
        return undefined;
      });

      const res = mockRes();
      await controller.signIn(
        { email: 'a@b.com', password: 'x' } as never,
        res as unknown as Response,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh',
        expect.objectContaining({ domain: '.example.com' }),
      );
    });

    it('clearCookie on logout uses the same domain options', async () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'app.nodeEnv') return 'development';
        if (key === 'auth.cookieDomain') return '.example.com';
        return undefined;
      });

      const res = mockRes();
      await controller.logout(
        { id: 'user-1', sessionId: 's1' } as never,
        res as unknown as Response,
      );

      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({
          domain: '.example.com',
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
        }),
      );
      const clearOpts = (
        res.clearCookie.mock.calls[0] as unknown[]
      )[1] as Record<string, unknown>;
      expect(clearOpts.maxAge).toBeUndefined();
    });
  });
});
