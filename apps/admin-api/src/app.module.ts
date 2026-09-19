import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuditModule } from './audit/audit.module';
import { CommonAuthModule } from './common/common-auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { CustomerModule } from './customer/customer.module';
import { OrganizationModule } from './organization/organization.module';
import { WebsiteModule } from './website/website.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HeadlessModule } from './headless/headless.module';
import { AgencyModule } from './agency/agency.module';
import { ShippingModule } from './shipping/shipping.module';
import { PaymentModule } from './payment/payment.module';
import { TemporalModule } from './temporal/temporal.module';
import { SearchModule } from './search/search.module';
import { AiModule } from './ai/ai.module';
import { SocialModule } from './social/social.module';
import { PosModule } from './pos/pos.module';
import { LiveModule } from './live/live.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { CrmModule } from './crm/crm.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { JourneyModule } from './journey/journey.module';
import { CxModule } from './cx/cx.module';
import { IamModule } from './iam/iam.module';
import { BillingModule } from './billing/billing.module';
import { HrModule } from './hr/hr.module';
import { HrmModule } from './hrm/hrm.module';
import { HealthController } from './health/health.controller';
import { MeController } from './iam/me.controller';
import { TenancyController } from './tenancy/tenancy.controller';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuditModule,
    CommonAuthModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    CustomerModule,
    OrganizationModule,
    WebsiteModule,
    AnalyticsModule,
    HeadlessModule,
    AgencyModule,
    ShippingModule,
    PaymentModule,
    TemporalModule,
    SearchModule,
    AiModule,
    SocialModule,
    PosModule,
    LiveModule,
    MarketplaceModule,
    CrmModule,
    LoyaltyModule,
    JourneyModule,
    CxModule,
    IamModule,
    BillingModule,
    HrModule,
    HrmModule,
  ],
  controllers: [HealthController, MeController, TenancyController],
})
export class AppModule {}
