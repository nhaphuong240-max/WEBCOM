import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ShippingModule } from '../shipping/shipping.module';
import { TemporalModule } from '../temporal/temporal.module';
import { BillingModule } from '../billing/billing.module';
import { HrModule } from '../hr/hr.module';
import { AiGatewayClient } from '../ai/ai-gateway.client';
import { WebsiteController } from './website.controller';
import { WebsiteService } from './website.service';
import { PlatformService } from './platform.service';
import { PlatformCmsController } from './platform-cms.controller';
import { PlatformCmsService } from './platform-cms.service';

@Module({
  imports: [
    AuditModule,
    ShippingModule,
    forwardRef(() => TemporalModule),
    BillingModule,
    forwardRef(() => HrModule),
  ],
  controllers: [WebsiteController, PlatformCmsController],
  providers: [WebsiteService, PlatformService, PlatformCmsService, AiGatewayClient],
  exports: [WebsiteService, PlatformService, PlatformCmsService],
})
export class WebsiteModule {}
