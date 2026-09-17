import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CatalogModule } from '../catalog/catalog.module';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { ShopeeConnector } from './shopee.connector';

@Module({
  imports: [AuditModule, CatalogModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, ShopeeConnector],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
