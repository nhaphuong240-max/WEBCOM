import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CatalogController } from './catalog.controller';
import { CatalogService, PricingService } from './catalog.service';

@Module({
  imports: [AuditModule],
  controllers: [CatalogController],
  providers: [CatalogService, PricingService],
  exports: [CatalogService, PricingService],
})
export class CatalogModule {}
