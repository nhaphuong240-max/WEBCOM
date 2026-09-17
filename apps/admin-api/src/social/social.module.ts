import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CartModule } from '../cart/cart.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { CatalogModule } from '../catalog/catalog.module';
import { SocialConnectors } from './social.connectors';
import { SocialService } from './social.service';
import { SocialDraftService } from './social-draft.service';
import { SocialController } from './social.controller';

@Module({
  imports: [AuditModule, CartModule, CheckoutModule, CatalogModule],
  controllers: [SocialController],
  providers: [SocialConnectors, SocialService, SocialDraftService],
  exports: [SocialService, SocialDraftService],
})
export class SocialModule {}
