import { UserEntity } from '@/api/user/entities/user.entity';
import { ADMIN_SCOPE } from '@/constants/app.constant';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DASHBOARD_SCOPE,
  PLAIN_EMAIL,
  PLAIN_PASSWORD,
  api,
  bearer,
  createPlainUser,
  decodeToken,
  grantScope,
  login,
  loginAgent,
  revokeScope,
} from './utils/auth.helper';
import { createTestApp, resetDatabase } from './utils/create-test-app';

const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

describe('Auth + scopes (e2e)', () => {
  let app: INestApplication;
  let plainUser: UserEntity;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    plainUser = await createPlainUser(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('issues an admin access token carrying scopes and a 15m TTL', async () => {
    const tokens = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const payload = decodeToken(tokens.accessToken);

    expect(payload.scopes).toEqual([ADMIN_SCOPE]);
    expect(payload.exp - payload.iat).toBe(900);
    expect(payload).not.toHaveProperty('role');
  });

  it('issues an empty scope list for a user without scopes', async () => {
    const tokens = await login(app, PLAIN_EMAIL, PLAIN_PASSWORD);

    expect(decodeToken(tokens.accessToken).scopes).toEqual([]);
  });

  it('rejects a missing token with 401', async () => {
    await api(app).get('/api/v1/users/me').expect(401);
  });

  it('rejects a malformed token with 401', async () => {
    await api(app)
      .get('/api/v1/users/me')
      .set({ Authorization: 'Bearer not-a-jwt' })
      .expect(401);
  });

  it('blacklists the session on logout so the access token dies immediately', async () => {
    const tokens = await login(app, PLAIN_EMAIL, PLAIN_PASSWORD);

    await api(app).post('/api/v1/auth/logout').set(bearer(tokens)).expect(200);
    await api(app).get('/api/v1/users/me').set(bearer(tokens)).expect(401);
  });

  it('denies every admin route to a non-admin user (403)', async () => {
    const tokens = await login(app, PLAIN_EMAIL, PLAIN_PASSWORD);
    const auth = bearer(tokens);

    // Table-driven on purpose: adding an admin route without a decorator should
    // be a one-line change here, and this is the regression net for exposure.
    const adminOnlyRoutes: Array<{
      label: string;
      send: () => request.Test;
    }> = [
      {
        label: 'GET /scopes',
        send: () => api(app).get('/api/v1/scopes').set(auth),
      },
      {
        label: 'POST /scopes',
        send: () =>
          api(app).post('/api/v1/scopes').set(auth).send({ name: 'NOPE' }),
      },
      {
        label: 'GET /mfe-configs',
        send: () => api(app).get('/api/v1/mfe-configs').set(auth),
      },
      {
        label: 'POST /mfe-configs',
        send: () => api(app).post('/api/v1/mfe-configs').set(auth).send({}),
      },
      {
        label: 'GET /users',
        send: () => api(app).get('/api/v1/users').set(auth),
      },
      {
        label: 'GET /users/load-more',
        send: () => api(app).get('/api/v1/users/load-more').set(auth),
      },
      {
        label: 'GET /users/:id',
        send: () => api(app).get(`/api/v1/users/${plainUser.id}`).set(auth),
      },
      {
        label: 'PATCH /users/:id',
        send: () =>
          api(app)
            .patch(`/api/v1/users/${plainUser.id}`)
            .set(auth)
            .send({ bio: 'nope' }),
      },
      {
        label: 'DELETE /users/:id',
        send: () => api(app).delete(`/api/v1/users/${plainUser.id}`).set(auth),
      },
      {
        label: 'GET /scopes/:id',
        send: () => api(app).get(`/api/v1/scopes/${UNKNOWN_UUID}`).set(auth),
      },
      {
        label: 'PATCH /scopes/:id',
        send: () =>
          api(app)
            .patch(`/api/v1/scopes/${UNKNOWN_UUID}`)
            .set(auth)
            .send({ description: 'nope' }),
      },
      {
        label: 'DELETE /scopes/:id',
        send: () => api(app).delete(`/api/v1/scopes/${UNKNOWN_UUID}`).set(auth),
      },
      {
        label: 'GET /mfe-configs/:id',
        send: () =>
          api(app).get(`/api/v1/mfe-configs/${UNKNOWN_UUID}`).set(auth),
      },
      {
        label: 'PATCH /mfe-configs/:id',
        send: () =>
          api(app)
            .patch(`/api/v1/mfe-configs/${UNKNOWN_UUID}`)
            .set(auth)
            .send({ remoteName: 'nope' }),
      },
      {
        label: 'DELETE /mfe-configs/:id',
        send: () =>
          api(app).delete(`/api/v1/mfe-configs/${UNKNOWN_UUID}`).set(auth),
      },
      {
        label: 'POST /users',
        send: () =>
          api(app).post('/api/v1/users').set(auth).send({
            username: 'nope',
            email: 'nope@example.com',
            password: '12345678',
          }),
      },
    ];

    const failures: string[] = [];
    let denied = 0;

    for (const route of adminOnlyRoutes) {
      const response = await route.send();
      if (response.status === 403) {
        denied++;
      } else {
        failures.push(`${route.label} -> ${response.status}`);
      }
    }

    // Asserting the totals keeps this non-vacuous: emptying the table above
    // would fail here rather than silently passing.
    expect({
      checked: adminOnlyRoutes.length,
      denied,
      failures,
    }).toEqual({ checked: 16, denied: 16, failures: [] });
  });

  it('serves the admin read routes to an admin (route ordering intact)', async () => {
    const tokens = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const auth = bearer(tokens);

    // `GET /users/load-more` must resolve as a static route, not as
    // `GET /users/:id`. A non-admin only ever sees 403 because ScopesGuard runs
    // before ParseUUIDPipe, so the 403 matrix above is blind to that
    // mis-ordering — this admin-200 check is what detects it. Mirrors the
    // `accessible` route-order test in mfe-config.e2e-spec.ts.
    const adminReadRoutes = [
      '/api/v1/scopes',
      '/api/v1/mfe-configs',
      '/api/v1/users',
      '/api/v1/users/load-more',
    ];

    const failures: string[] = [];
    let served = 0;

    for (const path of adminReadRoutes) {
      const response = await api(app).get(path).set(auth);
      if (response.status === 200) {
        served++;
      } else {
        failures.push(`${path} -> ${response.status}`);
      }
    }

    expect({
      checked: adminReadRoutes.length,
      served,
      failures,
    }).toEqual({ checked: 4, served: 4, failures: [] });
  });

  it('allows a non-admin on /users/me and /mfe-configs/accessible', async () => {
    const tokens = await login(app, PLAIN_EMAIL, PLAIN_PASSWORD);

    await api(app).get('/api/v1/users/me').set(bearer(tokens)).expect(200);
    await api(app)
      .get('/api/v1/mfe-configs/accessible')
      .set(bearer(tokens))
      .expect(200);
  });

  it('picks up a newly granted scope on refresh, leaving the old token stale', async () => {
    const { agent, accessToken } = await loginAgent(
      app,
      PLAIN_EMAIL,
      PLAIN_PASSWORD,
    );
    expect(decodeToken(accessToken).scopes).toEqual([]);

    await grantScope(app, plainUser.id, DASHBOARD_SCOPE);

    // Agent carries the refresh_token cookie automatically
    const refreshed = await agent.post('/api/v1/auth/refresh').expect(200);

    expect(refreshed.body).not.toHaveProperty('refreshToken');
    expect(refreshed.body).toHaveProperty('userId');
    expect(decodeToken(refreshed.body.accessToken).scopes).toEqual([
      DASHBOARD_SCOPE,
    ]);
    // The original access token is unchanged until it expires.
    expect(decodeToken(accessToken).scopes).toEqual([]);

    await revokeScope(app, plainUser.id, DASHBOARD_SCOPE);
  });

  it('returns 401 when refresh_token cookie is missing', async () => {
    // Raw request with no cookie — must not fall through to DTO validation.
    await api(app).post('/api/v1/auth/refresh').expect(401);
  });

  it('login response contains no refreshToken in body but sets HttpOnly cookie', async () => {
    const response = await api(app)
      .post('/api/v1/auth/email/login')
      .send({ email: PLAIN_EMAIL, password: PLAIN_PASSWORD })
      .expect(200);

    expect(response.body).not.toHaveProperty('refreshToken');
    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('tokenExpires');

    const rawCookie = response.headers['set-cookie'];
    const cookieStr = Array.isArray(rawCookie)
      ? rawCookie.join('; ')
      : (rawCookie ?? '');
    expect(cookieStr).toMatch(/refresh_token=/);
    expect(cookieStr).toMatch(/HttpOnly/i);
  });
});
