import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { MeController } from './iam/me.controller';
import { AuthController } from './iam/auth.controller';
import { TenancyController } from './tenancy/tenancy.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController, MeController, AuthController, TenancyController],
})
export class AppModule {}
