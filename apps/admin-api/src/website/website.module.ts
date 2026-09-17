import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WebsiteController } from './website.controller';
import { WebsiteService } from './website.service';
import { PlatformService } from './platform.service';

@Module({
  imports: [AuditModule],
  controllers: [WebsiteController],
  providers: [WebsiteService, PlatformService],
  exports: [WebsiteService, PlatformService],
})
export class WebsiteModule {}
