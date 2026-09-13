import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { HomeModule } from './home/home.module';
import { MfeConfigModule } from './mfe-config/mfe-config.module';
import { ScopeModule } from './scope/scope.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    UserModule,
    HealthModule,
    AuthModule,
    HomeModule,
    ScopeModule,
    MfeConfigModule,
  ],
})
export class ApiModule {}
