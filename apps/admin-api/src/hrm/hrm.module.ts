import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { HrmController } from './hrm.controller';
import { HrmOrgService } from './hrm-org.service';
import { HrmContractService } from './hrm-contract.service';
import { HrmLeaveService } from './hrm-leave.service';
import { HrmAttendanceService } from './hrm-attendance.service';
import { HrmPayrollService } from './hrm-payroll.service';

@Module({
  imports: [AuditModule],
  controllers: [HrmController],
  providers: [
    HrmOrgService,
    HrmContractService,
    HrmLeaveService,
    HrmAttendanceService,
    HrmPayrollService,
  ],
  exports: [
    HrmOrgService,
    HrmContractService,
    HrmLeaveService,
    HrmAttendanceService,
    HrmPayrollService,
  ],
})
export class HrmModule {}
