import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { SecurityModule } from './security/security.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [CommonModule, SecurityModule, UsersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
