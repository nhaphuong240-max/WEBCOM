import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';
import { CxService } from './cx.service';
import { CxController } from './cx.controller';

@Module({
  imports: [AuditModule, forwardRef(() => AiModule)],
  controllers: [CxController],
  providers: [CxService],
  exports: [CxService],
})
export class CxModule {}
