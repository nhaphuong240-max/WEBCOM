import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SocialModule } from '../social/social.module';
import { CxModule } from '../cx/cx.module';
import { AiGatewayClient } from './ai-gateway.client';
import { AiBudgetService } from './ai-budget.service';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [AuditModule, forwardRef(() => SocialModule), forwardRef(() => CxModule)],
  controllers: [AiController],
  providers: [AiGatewayClient, AiBudgetService, AiService],
  exports: [AiService, AiGatewayClient, AiBudgetService],
})
export class AiModule {}
