import { UserEntity } from '@/api/user/entities/user.entity';
import { ADMIN_SCOPE } from '@/constants/app.constant';
import { type INestApplication } from '@nestjs/common';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  type Tokens,
  api,
  bearer,
  createPlainUser,
  grantScope,
  login,
  scopeIdByName,
} from './utils/auth.helper';
import { createTestApp, resetDatabase } from './utils/create-test-app';

const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

describe('Scope CRUD (e2e)', () => {
  let app: INestApplication;
  let admin: Tokens;
  let plainUser: UserEntity;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    admin = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    plainUser = await createPlainUser(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const createScope = (body: Record<string, unknown>) =>
    api(app).post('/api/v1/scopes').set(bearer(admin)).send(body);

  it('creates a scope and normalises the name to uppercase', async () => {
    const response = await createScope({
      name: 'reports',
      description: 'Reporting scope',
    }).expect(201);

    expect(response.body.name).toBe('REPORTS');
    expect(response.body.description).toBe('Reporting scope');
  });

  it('returns 409 for a duplicate scope name', async () => {
    await createScope({ name: 'DUPLICATE_ME' }).expect(201);
    await createScope({ name: 'DUPLICATE_ME' }).expect(409);
  });

  it('returns 422 for an invalid scope name', async () => {
    await createScope({ name: 'bad name!' }).expect(422);
    await createScope({ name: 'A' }).expect(422);
  });

  it('returns 404 for an unknown scope id', async () => {
    await api(app)
      .get(`/api/v1/scopes/${UNKNOWN_UUID}`)
      .set(bearer(admin))
      .expect(404);
  });

  it('updates an existing scope', async () => {
    const created = await createScope({ name: 'PATCHABLE' }).expect(201);

    const response = await api(app)
      .patch(`/api/v1/scopes/${created.body.id}`)
      .set(bearer(admin))
      .send({ description: 'patched' })
      .expect(200);

    expect(response.body.description).toBe('patched');
    expect(response.body.name).toBe('PATCHABLE');
  });

  it('refuses to delete a scope that a user still holds (409)', async () => {
    const created = await createScope({ name: 'IN_USE_BY_USER' }).expect(201);
    await grantScope(app, plainUser.id, 'IN_USE_BY_USER');

    const response = await api(app)
      .delete(`/api/v1/scopes/${created.body.id}`)
      .set(bearer(admin))
      .expect(409);

    expect(response.body.errorCode).toBe('E005');
  });

  it('refuses to delete a scope that an MFE config still uses (409)', async () => {
    const created = await createScope({ name: 'IN_USE_BY_CONFIG' }).expect(201);

    await api(app)
      .post('/api/v1/mfe-configs')
      .set(bearer(admin))
      .send({
        remoteEntry: 'http://localhost:3010/remoteEntry.js',
        remoteName: 'in-use',
        exposedModule: './InUseModule',
        routeName: 'in-use-route',
        title: 'In Use',
        framework: 'react',
        scopeNames: ['IN_USE_BY_CONFIG'],
      })
      .expect(201);

    await api(app)
      .delete(`/api/v1/scopes/${created.body.id}`)
      .set(bearer(admin))
      .expect(409);
  });

  it('deletes a scope nothing references', async () => {
    const created = await createScope({ name: 'UNUSED' }).expect(201);

    await api(app)
      .delete(`/api/v1/scopes/${created.body.id}`)
      .set(bearer(admin))
      .expect(200);

    await api(app)
      .get(`/api/v1/scopes/${created.body.id}`)
      .set(bearer(admin))
      .expect(404);
  });

  it('refuses to rename the ADMIN scope (409)', async () => {
    const adminScope = await scopeIdByName(app, ADMIN_SCOPE);

    await api(app)
      .patch(`/api/v1/scopes/${adminScope.id}`)
      .set(bearer(admin))
      .send({ name: 'SUPERADMIN' })
      .expect(409);
  });
});
