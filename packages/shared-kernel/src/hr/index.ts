export {
  HR_PERMISSIONS,
  PERMISSION_CATALOG,
  getPermissionDef,
  isHrPermission,
  isSensitivePermission,
} from './permissions';
export type { HrPermission, PermissionDef } from './permissions';

export {
  ROLE_TEMPLATES,
  listRoleTemplates,
  getRoleTemplate,
  resolvePermissions,
  roleHasPermission,
  hasPermission,
} from './role-templates';
export type { DataScopeType, RoleTemplateDef } from './role-templates';
