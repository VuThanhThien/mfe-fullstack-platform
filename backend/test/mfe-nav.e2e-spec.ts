import { ADMIN_SCOPE } from '@/constants/app.constant';
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

const REMOTE_ENTRY = 'http://localhost:5173/remoteEntry.js';
const DASHBOARD_EMAIL = 'dashboard-nav@example.com';
const ROUTE_NAME = 'product-nav';

describe('MFE nav items (e2e)', () => {
  let app: INestApplication;
  let admin: Tokens;
  let configId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    admin = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);

    const dashboardUser = await createPlainUser(
      app,
      DASHBOARD_EMAIL,
      'dashboardnav',
    );
    await grantScope(app, dashboardUser.id, DASHBOARD_SCOPE);
    await createPlainUser(app, PLAIN_EMAIL, 'plainuser');

    const created = await api(app)
      .post('/api/v1/mfe-configs')
      .set(bearer(admin))
      .send({
        remoteEntry: REMOTE_ENTRY,
        remoteName: 'productNavRemote',
        exposedModule: './Product',
        routeName: ROUTE_NAME,
        title: 'Products',
        framework: 'react',
        iconUrl: 'https://example.com/icons/product.png',
        scopeNames: [DASHBOARD_SCOPE],
      })
      .expect(201);
    configId = created.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const createNode = (body: Record<string, unknown>) =>
    api(app)
      .post(`/api/v1/mfe-configs/${configId}/nav-items`)
      .set(bearer(admin))
      .send(body);

  it('rejects empty scopeNames with 422', async () => {
    await createNode({
      type: 'route',
      title: 'Empty',
      path: 'empty',
      scopeNames: [],
    }).expect(422);
  });

  it('rejects an http iconUrl with 422', async () => {
    await createNode({
      type: 'route',
      title: 'Bad icon',
      path: 'bad-icon',
      iconUrl: 'http://example.com/icon.png',
      scopeNames: [DASHBOARD_SCOPE],
    }).expect(422);
  });

  it('rejects a group that includes a path with 422', async () => {
    await createNode({
      type: 'group',
      title: 'Catalog',
      path: 'not-allowed',
      scopeNames: [DASHBOARD_SCOPE],
    }).expect(422);
  });

  it('lets ADMIN create a mixed-scope tree', async () => {
    const group = await createNode({
      type: 'group',
      title: 'Catalog',
      sortOrder: 0,
      scopeNames: [DASHBOARD_SCOPE],
    }).expect(201);
    expect(group.body.type).toBe('group');
    expect(group.body.scopeNames).toEqual([DASHBOARD_SCOPE]);

    await createNode({
      type: 'route',
      title: 'Product list',
      path: 'list',
      parentId: group.body.id,
      sortOrder: 0,
      scopeNames: [DASHBOARD_SCOPE],
    }).expect(201);

    await createNode({
      type: 'route',
      title: 'Import',
      path: 'import',
      parentId: group.body.id,
      sortOrder: 1,
      scopeNames: [ADMIN_SCOPE],
    }).expect(201);

    await createNode({
      type: 'group',
      title: 'Admin tools',
      sortOrder: 1,
      scopeNames: [ADMIN_SCOPE],
    }).expect(201);
  });

  it('resolves by-route/nav/accessible rather than as a UUID :id', async () => {
    const tokens = await login(app, DASHBOARD_EMAIL, PLAIN_PASSWORD);
    await api(app)
      .get(`/api/v1/mfe-configs/by-route/${ROUTE_NAME}/nav/accessible`)
      .set(bearer(tokens))
      .expect(200);
  });

  it('returns the filtered tree to a dashboard user (no ADMIN-only nodes)', async () => {
    const tokens = await login(app, DASHBOARD_EMAIL, PLAIN_PASSWORD);
    const response = await api(app)
      .get(`/api/v1/mfe-configs/by-route/${ROUTE_NAME}/nav/accessible`)
      .set(bearer(tokens))
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Catalog');
    expect(
      response.body[0].children.map((c: { title: string }) => c.title),
    ).toEqual(['Product list']);
    expect(response.body[0]).not.toHaveProperty('scopeNames');
  });

  it('404s for ADMIN on a DASHBOARD-only config (no accessible bypass)', async () => {
    await api(app)
      .get(`/api/v1/mfe-configs/by-route/${ROUTE_NAME}/nav/accessible`)
      .set(bearer(admin))
      .expect(404);
  });

  it('404s when the config is missing', async () => {
    const tokens = await login(app, DASHBOARD_EMAIL, PLAIN_PASSWORD);
    await api(app)
      .get('/api/v1/mfe-configs/by-route/does-not-exist/nav/accessible')
      .set(bearer(tokens))
      .expect(404);
  });

  it('forbids a dashboard user from ADMIN nav CRUD', async () => {
    const tokens = await login(app, DASHBOARD_EMAIL, PLAIN_PASSWORD);
    await api(app)
      .get(`/api/v1/mfe-configs/${configId}/nav-items`)
      .set(bearer(tokens))
      .expect(403);
  });

  it('returns the unfiltered admin tree including ADMIN-only nodes', async () => {
    const response = await api(app)
      .get(`/api/v1/mfe-configs/${configId}/nav-items`)
      .set(bearer(admin))
      .expect(200);

    const titles = response.body.map((n: { title: string }) => n.title);
    expect(titles).toEqual(expect.arrayContaining(['Catalog', 'Admin tools']));
    const catalog = response.body.find(
      (n: { title: string }) => n.title === 'Catalog',
    );
    expect(catalog.children.map((c: { title: string }) => c.title)).toEqual([
      'Product list',
      'Import',
    ]);
  });
});
