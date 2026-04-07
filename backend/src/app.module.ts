import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [CommonModule, SecurityModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
