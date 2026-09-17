import { Module, forwardRef } from '@nestjs/common';
import { WebsiteModule } from '../website/website.module';
import { TemporalService } from './temporal.service';
import { TemporalWorkflowsService } from './temporal-workflows.service';
import { TemporalController } from './temporal.controller';

@Module({
  imports: [forwardRef(() => WebsiteModule)],
  controllers: [TemporalController],
  providers: [TemporalService, TemporalWorkflowsService],
  exports: [TemporalService, TemporalWorkflowsService],
})
export class TemporalModule {}
