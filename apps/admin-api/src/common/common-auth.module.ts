import { Global, Module } from '@nestjs/common';
import { TenantAuthGuard } from './tenant-auth.guard';
import { StorefrontContextGuard } from './storefront-context.guard';

@Global()
@Module({
  providers: [TenantAuthGuard, StorefrontContextGuard],
  exports: [TenantAuthGuard, StorefrontContextGuard],
})
export class CommonAuthModule {}
