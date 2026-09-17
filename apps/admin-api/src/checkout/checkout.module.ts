import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { AuditModule } from '../audit/audit.module';
import { ShippingModule } from '../shipping/shipping.module';
import { PaymentModule } from '../payment/payment.module';
import { WebsiteModule } from '../website/website.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [CartModule, AuditModule, ShippingModule, PaymentModule, WebsiteModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
