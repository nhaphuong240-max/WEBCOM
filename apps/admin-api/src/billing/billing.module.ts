import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PaymentModule } from '../payment/payment.module';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [AuditModule, PaymentModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
