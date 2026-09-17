import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CrmService } from './crm.service';
import { CrmIdentityService } from './crm-identity.service';
import { CrmRfmService } from './crm-rfm.service';
import { CrmSegmentService } from './crm-segment.service';
import { CrmController } from './crm.controller';

@Module({
  imports: [AuditModule],
  controllers: [CrmController],
  providers: [CrmService, CrmIdentityService, CrmRfmService, CrmSegmentService],
  exports: [CrmService, CrmIdentityService, CrmRfmService, CrmSegmentService],
})
export class CrmModule {}
