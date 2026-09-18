import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WebsiteModule } from '../website/website.module';
import { JwtTokenService } from './jwt-token.service';
import { TrialService } from './trial.service';
import { AuthController, TrialController } from './auth.controller';

@Module({
  imports: [AuditModule, WebsiteModule],
  controllers: [AuthController, TrialController],
  providers: [JwtTokenService, TrialService],
  exports: [JwtTokenService, TrialService],
})
export class IamModule {}
