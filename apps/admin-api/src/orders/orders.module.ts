import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditModule } from '../audit/audit.module';
import { HrModule } from '../hr/hr.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [InventoryModule, AuditModule, HrModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
