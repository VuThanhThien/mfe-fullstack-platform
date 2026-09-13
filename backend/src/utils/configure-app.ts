import { AuthService } from '@/api/auth/auth.service';
import { type AllConfigType } from '@/config/config.type';
import { Environment } from '@/constants/app.constant';
import { GlobalExceptionFilter } from '@/filters/global-exception.filter';
import { AuthGuard } from '@/guards/auth.guard';
import { ScopesGuard } from '@/guards/scopes.guard';
import {
  ClassSerializerInterceptor,
  HttpStatus,
  type INestApplication,
  RequestMethod,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import setupSwagger from './setup-swagger';

/**
 * The complete HTTP pipeline, shared by `main.ts` and the e2e harness.
 *
 * Keeping this in one place is what stops e2e from silently exercising an app
 * without prefix/versioning/guards/filters — such a harness passes vacuously
 * and hides real authorization regressions.
 */
export function configureApp(app: INestApplication): INestApplication {
  // Setup security headers
  app.use(helmet());

  // Required to read req.cookies (res.cookie can set without it; reads cannot).
  app.use(cookieParser());

  // For high-traffic websites in production, it is strongly recommended to offload compression from the application server - typically in a reverse proxy (e.g., Nginx). In that case, you should not use compression middleware.
  app.use(compression());

  const configService = app.get(ConfigService<AllConfigType>);
  const reflector = app.get(Reflector);
  const nodeEnv = configService.getOrThrow('app.nodeEnv', { infer: true });
  const corsOrigin = configService.getOrThrow('app.corsOrigin', {
    infer: true,
  });

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  // Use global prefix if you don't have subdomain
  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: [
        { method: RequestMethod.GET, path: '/' },
        { method: RequestMethod.GET, path: 'health' },
      ],
    },
  );

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalGuards(
    // Order matters: AuthGuard populates request.user, ScopesGuard reads it.
    new AuthGuard(reflector, app.get(AuthService)),
    new ScopesGuard(reflector),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(configService));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors: ValidationError[]) => {
        return new UnprocessableEntityException(errors);
      },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  if (nodeEnv === Environment.DEVELOPMENT) {
    setupSwagger(app);
  }

  return app;
}
