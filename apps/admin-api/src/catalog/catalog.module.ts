import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SearchModule } from '../search/search.module';
import { CatalogController } from './catalog.controller';
import { CatalogService, PricingService } from './catalog.service';

@Module({
  imports: [AuditModule, forwardRef(() => SearchModule)],
  controllers: [CatalogController],
  providers: [CatalogService, PricingService],
  exports: [CatalogService, PricingService],
})
export class CatalogModule {}
