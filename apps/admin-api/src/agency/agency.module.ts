import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WebsiteModule } from '../website/website.module';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';

@Module({
  imports: [AuditModule, WebsiteModule],
  controllers: [AgencyController],
  providers: [AgencyService],
  exports: [AgencyService],
})
export class AgencyModule {}
