import { UserEntity } from '@/api/user/entities/user.entity';
import { type INestApplication } from '@nestjs/common';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DASHBOARD_SCOPE,
  PLAIN_EMAIL,
  PLAIN_PASSWORD,
  type Tokens,
  api,
  bearer,
  createPlainUser,
  grantScope,
  login,
} from './utils/auth.helper';
import { createTestApp, resetDatabase } from './utils/create-test-app';

const REMOTE_ENTRY = 'http://localhost:3001/remoteEntry.js';
const DASHBOARD_EMAIL = 'dashboard@example.com';

describe('MFE config (e2e)', () => {
  let app: INestApplication;
  let admin: Tokens;
  let dashboardUser: UserEntity;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    admin = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);

    dashboardUser = await createPlainUser(
      app,
      DASHBOARD_EMAIL,
      'dashboarduser',
    );
    await grantScope(app, dashboardUser.id, DASHBOARD_SCOPE);

    // Scope-less fixture for the negative `accessible` case.
    await createPlainUser(app, PLAIN_EMAIL, 'plainuser');
  });

  afterAll(async () => {
    await app.close();
  });

  const createConfig = (overrides: Record<string, unknown> = {}) =>
    api(app)
      .post('/api/v1/mfe-configs')
      .set(bearer(admin))
      .send({
        remoteEntry: REMOTE_ENTRY,
        remoteName: 'dashboard',
        exposedModule: './DashboardModule',
        routeName: 'dashboard',
        title: 'Dashboard',
        framework: 'react',
        scopeNames: [DASHBOARD_SCOPE],
        ...overrides,
      });

  it('creates a config together with its scopes', async () => {
    const response = await createConfig().expect(201);

    expect(response.body.scopes.map((s: { name: string }) => s.name)).toEqual([
      DASHBOARD_SCOPE,
    ]);
    expect(response.body.routeName).toBe('dashboard');
    expect(response.body.title).toBe('Dashboard');
    expect(response.body.framework).toBe('react');
  });

  it('rejects an empty scopeNames array with 422', async () => {
    await createConfig({
      remoteEntry: 'http://localhost:3002/remoteEntry.js',
      routeName: 'empty-scope',
      scopeNames: [],
    }).expect(422);
  });

  it('rejects an unknown scope name with 400 naming it', async () => {
    const response = await createConfig({
      remoteEntry: 'http://localhost:3003/remoteEntry.js',
      routeName: 'unknown-scope',
      scopeNames: ['NOPE'],
    }).expect(400);

    expect(JSON.stringify(response.body)).toContain('NOPE');
  });

  it('rejects a remoteEntry that is not an absolute URL with 422', async () => {
    await createConfig({
      remoteEntry: 'not-a-url',
      routeName: 'bad-url',
    }).expect(422);
  });

  it('rejects an http iconUrl with 422', async () => {
    await createConfig({
      remoteEntry: 'http://localhost:3008/remoteEntry.js',
      remoteName: 'httpIconRemote',
      routeName: 'http-icon',
      iconUrl: 'http://example.com/icon.png',
    }).expect(422);
  });

  it('rejects a routeName with path separators with 422', async () => {
    await createConfig({
      remoteEntry: 'http://localhost:3006/remoteEntry.js',
      remoteName: 'pathTraversalRemote',
      routeName: '../../login',
    }).expect(422);
  });

  it('allows the same remoteEntry and remoteName for a second expose', async () => {
    await createConfig({
      remoteEntry: REMOTE_ENTRY,
      remoteName: 'dashboard',
      exposedModule: './Articles',
      routeName: 'articles',
      title: 'Articles',
    }).expect(201);
  });

  it('returns 409 for a duplicate remoteName + exposedModule pair', async () => {
    await createConfig({
      remoteEntry: 'http://localhost:3005/remoteEntry.js',
      remoteName: 'dashboard',
      exposedModule: './DashboardModule',
      routeName: 'dup-expose',
    }).expect(409);
  });

  it('returns 409 for a duplicate routeName', async () => {
    await createConfig({
      remoteEntry: 'http://localhost:3005/remoteEntry.js',
      remoteName: 'uniqueRemote',
      exposedModule: './Other',
      // routeName 'dashboard' already taken by the first createConfig call
    }).expect(409);
  });

  it('lists configs with the full scope set (join does not truncate it)', async () => {
    const response = await api(app)
      .get('/api/v1/mfe-configs')
      .set(bearer(admin))
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(
      response.body.data[0].scopes.map((s: { name: string }) => s.name),
    ).toEqual([DASHBOARD_SCOPE]);
    // New fields must be present
    expect(response.body.data[0]).toHaveProperty('routeName');
    expect(response.body.data[0]).toHaveProperty('title');
    expect(response.body.data[0]).toHaveProperty('framework');
  });

  it('resolves `accessible` as a route rather than as an :id', async () => {
    // A UUID ParseUUIDPipe on `:id` would answer 400 if the static route were
    // declared after `:id`.
    await api(app)
      .get('/api/v1/mfe-configs/accessible')
      .set(bearer(admin))
      .expect(200);
  });

  it('returns the ANY-overlap set to a user holding the scope', async () => {
    const tokens = await login(app, DASHBOARD_EMAIL, PLAIN_PASSWORD);

    const response = await api(app)
      .get('/api/v1/mfe-configs/accessible')
      .set(bearer(tokens))
      .expect(200);

    expect(
      response.body.map((c: { remoteName: string }) => c.remoteName),
    ).toEqual(['dashboard', 'dashboard']);
    const dashboardCfg = response.body.find(
      (c: { routeName: string }) => c.routeName === 'dashboard',
    );
    expect(dashboardCfg).toBeDefined();
    // The response deliberately omits `scopes`.
    expect(dashboardCfg).not.toHaveProperty('scopes');
    // New fields must be present in accessible response
    expect(dashboardCfg).toHaveProperty('routeName', 'dashboard');
    expect(dashboardCfg).toHaveProperty('title', 'Dashboard');
    expect(dashboardCfg).toHaveProperty('framework', 'react');
  });

  it('returns [] to a user with no scopes', async () => {
    const tokens = await login(app, PLAIN_EMAIL, PLAIN_PASSWORD);

    const response = await api(app)
      .get('/api/v1/mfe-configs/accessible')
      .set(bearer(tokens))
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('does not give ADMIN a bypass on accessible', async () => {
    // Admin owns ADMIN only; the one config is DASHBOARD-scoped, so the
    // intersection is empty. The full registry is GET /mfe-configs (ADMIN).
    const response = await api(app)
      .get('/api/v1/mfe-configs/accessible')
      .set(bearer(admin))
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('leaves scopes intact when PATCH omits scopeNames', async () => {
    const list = await api(app)
      .get('/api/v1/mfe-configs')
      .set(bearer(admin))
      .expect(200);
    const { id } = list.body.data[0];

    const response = await api(app)
      .patch(`/api/v1/mfe-configs/${id}`)
      .set(bearer(admin))
      .send({ remoteName: 'renamed' })
      .expect(200);

    expect(response.body.remoteName).toBe('renamed');
    expect(response.body.scopes.map((s: { name: string }) => s.name)).toEqual([
      DASHBOARD_SCOPE,
    ]);
  });
});
