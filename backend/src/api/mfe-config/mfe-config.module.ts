import { ScopeModule } from '@/api/scope/scope.module';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MfeConfigEntity } from './entities/mfe-config.entity';
import { MfeConfigController } from './mfe-config.controller';
import { MfeConfigService } from './mfe-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MfeConfigEntity, UserEntity]),
    ScopeModule,
  ],
  controllers: [MfeConfigController],
  providers: [MfeConfigService],
})
export class MfeConfigModule {}
