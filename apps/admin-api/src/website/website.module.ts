import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ShippingModule } from '../shipping/shipping.module';
import { TemporalModule } from '../temporal/temporal.module';
import { BillingModule } from '../billing/billing.module';
import { AiGatewayClient } from '../ai/ai-gateway.client';
import { WebsiteController } from './website.controller';
import { WebsiteService } from './website.service';
import { PlatformService } from './platform.service';

@Module({
  imports: [
    AuditModule,
    ShippingModule,
    forwardRef(() => TemporalModule),
    BillingModule,
  ],
  controllers: [WebsiteController],
  providers: [WebsiteService, PlatformService, AiGatewayClient],
  exports: [WebsiteService, PlatformService],
})
export class WebsiteModule {}
