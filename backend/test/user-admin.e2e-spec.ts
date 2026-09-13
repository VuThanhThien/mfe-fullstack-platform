import { type INestApplication } from '@nestjs/common';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DASHBOARD_SCOPE,
  PLAIN_PASSWORD,
  type Tokens,
  api,
  bearer,
  decodeToken,
  login,
  loginAgent,
} from './utils/auth.helper';
import { createTestApp, resetDatabase } from './utils/create-test-app';

const TARGET_EMAIL = 'patchtarget@example.com';

describe('User administration (e2e)', () => {
  let app: INestApplication;
  let admin: Tokens;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    admin = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PATCH /users/:id', () => {
    it('updates scalars without corrupting the stored password', async () => {
      const created = await api(app)
        .post('/api/v1/users')
        .set(bearer(admin))
        .send({
          username: 'patchtarget',
          email: TARGET_EMAIL,
          password: PLAIN_PASSWORD,
          bio: 'original',
          image: 'https://example.com/a.png',
        })
        .expect(201);

      await login(app, TARGET_EMAIL, PLAIN_PASSWORD);

      const patched = await api(app)
        .patch(`/api/v1/users/${created.body.id}`)
        .set(bearer(admin))
        .send({ bio: 'patched' })
        .expect(200);

      expect(patched.body.bio).toBe('patched');
      // Omitted fields are left untouched.
      expect(patched.body.image).toBe('https://example.com/a.png');

      // Regression: the update used `save()`, which re-ran
      // `@BeforeUpdate hashPassword()` over the already-hashed password, so this
      // login used to return 401.
      await login(app, TARGET_EMAIL, PLAIN_PASSWORD);
    });

    it('uppercases scopeNames so lowercase names resolve', async () => {
      const created = await api(app)
        .post('/api/v1/users')
        .set(bearer(admin))
        .send({
          username: 'scopetarget',
          email: 'scopetarget@example.com',
          password: PLAIN_PASSWORD,
        })
        .expect(201);

      const patched = await api(app)
        .patch(`/api/v1/users/${created.body.id}`)
        .set(bearer(admin))
        .send({ scopeNames: ['dashboard'] })
        .expect(200);

      expect(
        patched.body.scopes.map((scope: { name: string }) => scope.name),
      ).toEqual([DASHBOARD_SCOPE]);
    });
  });

  describe('DELETE /users/:id', () => {
    it('revokes grants and kills the session, so the scope becomes deletable', async () => {
      const scope = await api(app)
        .post('/api/v1/scopes')
        .set(bearer(admin))
        .send({ name: 'TEMP_SCOPE' })
        .expect(201);

      const victim = await api(app)
        .post('/api/v1/users')
        .set(bearer(admin))
        .send({
          username: 'victim',
          email: 'victim@example.com',
          password: PLAIN_PASSWORD,
          scopeNames: ['TEMP_SCOPE'],
        })
        .expect(201);

      // Login via agent so the cookie is retained for the refresh check.
      const { agent: victimAgent, accessToken: victimAccessToken } =
        await loginAgent(app, 'victim@example.com', PLAIN_PASSWORD);
      expect(decodeToken(victimAccessToken).scopes).toEqual(['TEMP_SCOPE']);

      await api(app)
        .delete(`/api/v1/users/${victim.body.id}`)
        .set(bearer(admin))
        .expect(200);

      // Regression: the leftover `user_scope` row made this a 500 (the FK is
      // RESTRICT while the in-use pre-check ignored soft-deleted users).
      await api(app)
        .delete(`/api/v1/scopes/${scope.body.id}`)
        .set(bearer(admin))
        .expect(200);

      // The deleted user's access token must stop working immediately…
      await api(app)
        .get('/api/v1/users/me')
        .set(bearer({ accessToken: victimAccessToken, userId: victim.body.id }))
        .expect(401);

      // …and refreshing is an authentication failure, not a 404.
      await victimAgent.post('/api/v1/auth/refresh').expect(401);
    });
  });

  describe('POST /mfe-configs', () => {
    it('uppercases scopeNames so lowercase names resolve', async () => {
      const response = await api(app)
        .post('/api/v1/mfe-configs')
        .set(bearer(admin))
        .send({
          remoteEntry: 'http://localhost:3020/remoteEntry.js',
          remoteName: 'lowercase-scope',
          exposedModule: './LowercaseModule',
          routeName: 'lowercase-scope-route',
          title: 'Lowercase Scope',
          framework: 'react',
          scopeNames: ['dashboard'],
        })
        .expect(201);

      expect(
        response.body.scopes.map((scope: { name: string }) => scope.name),
      ).toEqual([DASHBOARD_SCOPE]);
    });
  });
});
