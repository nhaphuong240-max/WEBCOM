import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ShippingModule } from '../shipping/shipping.module';
import { TemporalModule } from '../temporal/temporal.module';
import { BillingModule } from '../billing/billing.module';
import { AiModule } from '../ai/ai.module';
import { WebsiteController } from './website.controller';
import { WebsiteService } from './website.service';
import { PlatformService } from './platform.service';

@Module({
  imports: [
    AuditModule,
    ShippingModule,
    forwardRef(() => TemporalModule),
    BillingModule,
    AiModule,
  ],
  controllers: [WebsiteController],
  providers: [WebsiteService, PlatformService],
  exports: [WebsiteService, PlatformService],
})
export class WebsiteModule {}
