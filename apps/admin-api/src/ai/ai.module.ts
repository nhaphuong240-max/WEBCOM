import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AiGatewayClient } from './ai-gateway.client';
import { AiBudgetService } from './ai-budget.service';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [AuditModule],
  controllers: [AiController],
  providers: [AiGatewayClient, AiBudgetService, AiService],
  exports: [AiService, AiGatewayClient, AiBudgetService],
})
export class AiModule {}
