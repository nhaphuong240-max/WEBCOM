import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PosModule } from '../pos/pos.module';
import { HrController, HrPublicController } from './hr.controller';
import { ScimController } from './scim.controller';
import { HrIamService } from './hr-iam.service';
import { HrEmployeeService } from './hr-employee.service';
import { HrSessionService } from './hr-session.service';
import { HrShiftService } from './hr-shift.service';
import { HrRoleService } from './hr-role.service';

@Module({
  imports: [AuditModule, PosModule],
  controllers: [HrController, HrPublicController, ScimController],
  providers: [HrIamService, HrEmployeeService, HrSessionService, HrShiftService, HrRoleService],
  exports: [HrIamService, HrEmployeeService, HrSessionService, HrShiftService, HrRoleService],
})
export class HrModule {}
