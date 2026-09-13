import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { type AllConfigType } from './config/config.type';
import { configureApp } from './utils/configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  // Everything between here and `listen` lives in configureApp() so the e2e
  // harness runs the exact same pipeline (prefix, versioning, guards, filters,
  // pipes) instead of a bare application.
  configureApp(app);

  const configService = app.get(ConfigService<AllConfigType>);
  await app.listen(configService.getOrThrow('app.port', { infer: true }));

  console.info(`Server running on ${await app.getUrl()}`);

  return app;
}

void bootstrap();
