import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CartModule } from '../cart/cart.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { CustomerModule } from '../customer/customer.module';
import { WebsiteModule } from '../website/website.module';
import { HeadlessController } from './headless.controller';
import { HeadlessService } from './headless.service';
import { HeadlessApiKeyGuard } from './headless-api-key.guard';

@Module({
  imports: [AuditModule, CatalogModule, CartModule, CheckoutModule, CustomerModule, WebsiteModule],
  controllers: [HeadlessController],
  providers: [HeadlessService, HeadlessApiKeyGuard],
  exports: [HeadlessService],
})
export class HeadlessModule {}
