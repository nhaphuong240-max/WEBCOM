import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WebsiteModule } from '../website/website.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsBackfill } from './analytics.backfill';
import { ClickHouseClient } from './clickhouse.client';
import { RedpandaClient } from './redpanda.client';
import { EventSinkService } from './event-sink.service';

@Module({
  imports: [AuditModule, WebsiteModule],
  controllers: [AnalyticsController],
  providers: [
    ClickHouseClient,
    RedpandaClient,
    EventSinkService,
    AnalyticsService,
    AnalyticsBackfill,
  ],
  exports: [AnalyticsService, EventSinkService, ClickHouseClient],
})
export class AnalyticsModule {}
