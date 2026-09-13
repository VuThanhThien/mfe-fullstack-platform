import { ScopeEntity } from '@/api/scope/entities/scope.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { SYSTEM_USER_ID } from '@/constants/app.constant';
import { DASHBOARD_SCOPE } from '@/database/seeds/1722335726000-scope-seeder';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

export { DASHBOARD_SCOPE };

/** Seeded by `resetDatabase()` in create-test-app.ts. */
export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = '12345678';

/** Scope-less fixture created by `createPlainUser()`. */
export const PLAIN_EMAIL = 'plain@example.com';
export const PLAIN_PASSWORD = '12345678';

/**
 * Tokens returned by `login()`. No `refreshToken` — it is an HttpOnly cookie
 * managed by SuperTest agents when using `loginAgent()`.
 */
export type Tokens = { accessToken: string; userId: string };

export type AccessTokenPayload = {
  id: string;
  sessionId: string;
  scopes?: string[];
  iat: number;
  exp: number;
};

export const api = (app: INestApplication) => request(app.getHttpServer());

export const bearer = (tokens: Tokens): Record<string, string> => ({
  Authorization: `Bearer ${tokens.accessToken}`,
});

/**
 * Plain login — returns Tokens without a cookie-carrying agent.
 * Use for most tests that only need the access token.
 */
export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<Tokens> {
  const response = await api(app)
    .post('/api/v1/auth/email/login')
    .send({ email, password })
    .expect(200);

  return {
    accessToken: response.body.accessToken,
    userId: response.body.userId,
  };
}

/**
 * Agent-based login — the returned `agent` automatically carries the
 * `refresh_token` HttpOnly cookie for subsequent requests, enabling cookie-
 * driven refresh flows in tests.
 */
export async function loginAgent(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{
  agent: ReturnType<typeof request.agent>;
  accessToken: string;
  userId: string;
}> {
  const agent = request.agent(app.getHttpServer());
  const response = await agent
    .post('/api/v1/auth/email/login')
    .send({ email, password })
    .expect(200);

  return {
    agent,
    accessToken: response.body.accessToken,
    userId: response.body.userId,
  };
}

export function decodeToken(token: string): AccessTokenPayload {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

/**
 * Creates a scope-less user directly through the repository — `POST /users` is
 * ADMIN-only (that gate is itself covered by the authz matrix).
 */
export async function createPlainUser(
  app: INestApplication,
  email: string = PLAIN_EMAIL,
  username = 'plainuser',
): Promise<UserEntity> {
  const repository = app.get(DataSource).getRepository(UserEntity);
  const existing = await repository.findOne({ where: { email } });
  if (existing) return existing;

  return repository.save(
    new UserEntity({
      username,
      email,
      password: PLAIN_PASSWORD,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    }),
  );
}

export async function grantScope(
  app: INestApplication,
  userId: string,
  scopeName: string,
): Promise<void> {
  const dataSource = app.get(DataSource);
  const scope = await dataSource
    .getRepository(ScopeEntity)
    .findOneByOrFail({ name: scopeName });

  await dataSource
    .createQueryBuilder()
    .relation(UserEntity, 'scopes')
    .of(userId)
    .add(scope);
}

export async function revokeScope(
  app: INestApplication,
  userId: string,
  scopeName: string,
): Promise<void> {
  const dataSource = app.get(DataSource);
  const scope = await dataSource
    .getRepository(ScopeEntity)
    .findOneByOrFail({ name: scopeName });

  await dataSource
    .createQueryBuilder()
    .relation(UserEntity, 'scopes')
    .of(userId)
    .remove(scope);
}

export function scopeIdByName(
  app: INestApplication,
  name: string,
): Promise<ScopeEntity> {
  return app
    .get(DataSource)
    .getRepository(ScopeEntity)
    .findOneByOrFail({ name });
}
