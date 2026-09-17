import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuditModule } from './audit/audit.module';
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
import { HealthController } from './health/health.controller';
import { MeController } from './iam/me.controller';
import { AuthController } from './iam/auth.controller';
import { TenancyController } from './tenancy/tenancy.controller';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuditModule,
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
  ],
  controllers: [HealthController, MeController, AuthController, TenancyController],
})
export class AppModule {}
