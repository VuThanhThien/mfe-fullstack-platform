import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/create-test-app';

describe('App bootstrap (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves GET / from outside the api prefix', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Welcome to the API');
  });

  it('serves GET /health from outside the api prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('does not serve api routes without a version', async () => {
    await request(app.getHttpServer()).get('/api/users/me').expect(404);
  });
});
