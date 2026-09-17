import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CatalogModule } from '../catalog/catalog.module';
import { SocialModule } from '../social/social.module';
import { LiveService } from './live.service';
import { LiveController } from './live.controller';

@Module({
  imports: [AuditModule, CatalogModule, SocialModule],
  controllers: [LiveController],
  providers: [LiveService],
  exports: [LiveService],
})
export class LiveModule {}
