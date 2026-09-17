import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { RequestContext } from '@ptt/shared-kernel';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { CatalogService } from '../catalog/catalog.service';
import { SearchService } from './search.service';
import { SearchIndexerService } from './search-indexer.service';

@Controller()
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly indexer: SearchIndexerService,
    private readonly catalog: CatalogService,
  ) {}

  @Get('v1/admin/search/status')
  @UseGuards(TenantAuthGuard)
  status() {
    return this.search.status();
  }

  @Post('v1/admin/search/reindex')
  @UseGuards(TenantAuthGuard)
  reindex(@ReqContext() ctx: RequestContext) {
    return this.indexer.reindexTenant(ctx.tenantId);
  }

  @Get('v1/catalog/search')
  @UseGuards(StorefrontContextGuard)
  async catalogSearch(
    @ReqContext() ctx: RequestContext,
    @Query('q') q?: string,
    @Query('collection') collection?: string,
    @Query('sort') sort?: 'price_asc' | 'price_desc' | 'newest',
    @Query('brand_id') brandId?: string,
  ) {
    const started = Date.now();
    const result = await this.catalog.searchProducts(ctx.tenantId, {
      brandId: brandId ?? ctx.brandId,
      q,
      collection,
      sort,
    });
    return {
      ...result,
      total_ms: Date.now() - started,
    };
  }
}
