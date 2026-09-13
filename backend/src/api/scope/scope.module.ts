import { MfeConfigEntity } from '@/api/mfe-config/entities/mfe-config.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScopeEntity } from './entities/scope.entity';
import { ScopeController } from './scope.controller';
import { ScopeService } from './scope.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScopeEntity, UserEntity, MfeConfigEntity]),
  ],
  controllers: [ScopeController],
  providers: [ScopeService],
  exports: [ScopeService],
})
export class ScopeModule {}
