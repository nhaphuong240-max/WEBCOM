import { AppError } from '@ptt/shared-kernel';
import { hrFeature } from '../hr/hr-access';

export { assertPermission, resolveActorRoles } from '../hr/hr-access';

export function requireHrmPro(): void {
  if (!hrFeature('hrm.pro', false)) {
    throw AppError.validation('Feature hrm.pro disabled');
  }
}
