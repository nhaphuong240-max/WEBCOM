import { HR_PERMISSIONS, type HrPermission, isHrPermission } from './permissions';

/**
 * HR-0 — System role templates (immutable codes).
 * Custom tenant roles = HR-3 (DB); không sửa các code system ở đây khi runtime.
 */

export type DataScopeType = 'tenant' | 'brand' | 'store' | 'warehouse' | 'channel';

export type RoleTemplateDef = {
  code: string;
  name: string;
  description: string;
  system: true;
  /** Empty array + all:true = mọi permission trong catalog */
  all?: boolean;
  permissions: HrPermission[];
  defaultScopeType: DataScopeType;
};

const ALL = [...HR_PERMISSIONS];

/** Mọi quyền trừ secret.manage (admin vận hành thường ngày) */
const ADMIN_PERMS = ALL.filter((p) => p !== 'secret.manage');

const OPS_PERMS: HrPermission[] = [
  'hr.employee.read',
  'audit.read',
  'stock.adjust',
  'refund.issue',
  'price.override',
  'website.edit',
];

const STORE_MANAGER_PERMS: HrPermission[] = [
  'hr.employee.read',
  'hr.user.read',
  'pos.shift.manage',
  'pos.sell',
  'stock.adjust',
  'refund.issue',
  'price.override',
  'audit.read',
];

const CASHIER_PERMS: HrPermission[] = ['pos.sell', 'pos.shift.manage'];

const WEBSITE_EDITOR_PERMS: HrPermission[] = ['website.edit', 'hr.employee.read'];

const WEBSITE_PUBLISHER_PERMS: HrPermission[] = [
  'website.edit',
  'website.publish',
  'hr.employee.read',
];

const ANALYST_PERMS: HrPermission[] = [
  'hr.user.read',
  'hr.employee.read',
  'hr.role.read',
  'margin.view',
  'audit.read',
];

const READONLY_PERMS: HrPermission[] = [
  'hr.user.read',
  'hr.role.read',
  'hr.employee.read',
  'audit.read',
];

export const ROLE_TEMPLATES: RoleTemplateDef[] = [
  {
    code: 'owner',
    name: 'Owner',
    description: 'Toàn quyền tenant (gồm secret.manage)',
    system: true,
    all: true,
    permissions: ALL,
    defaultScopeType: 'tenant',
  },
  {
    code: 'admin',
    name: 'Admin',
    description: 'Quản trị vận hành — không gồm secret.manage',
    system: true,
    permissions: ADMIN_PERMS,
    defaultScopeType: 'tenant',
  },
  {
    code: 'ops',
    name: 'Operations',
    description: 'Đơn / tồn / chỉnh sửa site draft',
    system: true,
    permissions: OPS_PERMS,
    defaultScopeType: 'tenant',
  },
  {
    code: 'store_manager',
    name: 'Store Manager',
    description: 'Quản lý cửa hàng + ca POS',
    system: true,
    permissions: STORE_MANAGER_PERMS,
    defaultScopeType: 'store',
  },
  {
    code: 'cashier',
    name: 'Cashier',
    description: 'Bán hàng quầy + mở/đóng ca',
    system: true,
    permissions: CASHIER_PERMS,
    defaultScopeType: 'store',
  },
  {
    code: 'website_editor',
    name: 'Website Editor',
    description: 'Sửa CMS draft — không publish',
    system: true,
    permissions: WEBSITE_EDITOR_PERMS,
    defaultScopeType: 'brand',
  },
  {
    code: 'website_publisher',
    name: 'Website Publisher',
    description: 'Edit + publish site/page',
    system: true,
    permissions: WEBSITE_PUBLISHER_PERMS,
    defaultScopeType: 'brand',
  },
  {
    code: 'analyst',
    name: 'Analyst',
    description: 'Đọc + xem margin',
    system: true,
    permissions: ANALYST_PERMS,
    defaultScopeType: 'tenant',
  },
  {
    code: 'readonly',
    name: 'Read only',
    description: 'Chỉ đọc HR/audit cơ bản',
    system: true,
    permissions: READONLY_PERMS,
    defaultScopeType: 'tenant',
  },
];

const BY_CODE = new Map(ROLE_TEMPLATES.map((r) => [r.code, r]));

export function listRoleTemplates(): RoleTemplateDef[] {
  return ROLE_TEMPLATES;
}

export function getRoleTemplate(code: string): RoleTemplateDef | undefined {
  return BY_CODE.get(code);
}

/** Union permissions từ danh sách role codes (bỏ code lạ). */
export function resolvePermissions(roleCodes: string[]): HrPermission[] {
  const set = new Set<HrPermission>();
  for (const code of roleCodes) {
    const tpl = BY_CODE.get(code);
    if (!tpl) continue;
    if (tpl.all) {
      for (const p of HR_PERMISSIONS) set.add(p);
      continue;
    }
    for (const p of tpl.permissions) set.add(p);
  }
  return [...set];
}

export function roleHasPermission(roleCodes: string[], permission: string): boolean {
  if (!isHrPermission(permission)) return false;
  return resolvePermissions(roleCodes).includes(permission);
}

export function hasPermission(
  effective: readonly string[],
  required: HrPermission | HrPermission[],
): boolean {
  const need = Array.isArray(required) ? required : [required];
  const set = new Set(effective);
  return need.every((p) => set.has(p));
}
