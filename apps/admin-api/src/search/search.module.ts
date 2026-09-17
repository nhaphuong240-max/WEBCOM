import { Module, forwardRef } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { OpenSearchClient } from './opensearch.client';
import { SearchIndexerService } from './search-indexer.service';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [forwardRef(() => CatalogModule)],
  controllers: [SearchController],
  providers: [OpenSearchClient, SearchIndexerService, SearchService],
  exports: [OpenSearchClient, SearchIndexerService, SearchService],
})
export class SearchModule {}
