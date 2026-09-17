import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WebsiteModule } from '../website/website.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [AuditModule, WebsiteModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
