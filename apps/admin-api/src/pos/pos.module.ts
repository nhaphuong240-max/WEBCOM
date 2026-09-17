import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PaymentModule } from '../payment/payment.module';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';

@Module({
  imports: [AuditModule, CatalogModule, PaymentModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
