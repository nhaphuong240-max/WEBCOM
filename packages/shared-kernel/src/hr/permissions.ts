/**
 * HR-0 — Permission catalog (stable string codes).
 * Source of truth for HR-1 seed + guards. Do not invent ad-hoc codes in controllers.
 */

export const HR_PERMISSIONS = [
  'hr.user.read',
  'hr.user.manage',
  'hr.role.read',
  'hr.role.manage',
  'hr.employee.read',
  'hr.employee.manage',
  'hr.invite.manage',
  'hr.session.revoke',
  'margin.view',
  'ai.approve',
  'website.edit',
  'website.publish',
  'pii.export',
  'price.override',
  'refund.issue',
  'stock.adjust',
  'secret.manage',
  'audit.read',
  'pos.shift.manage',
  'pos.sell',
  // HRM-Pro
  'hrm.department.manage',
  'hrm.contract.read',
  'hrm.contract.manage',
  'hrm.leave.read',
  'hrm.leave.manage',
  'hrm.leave.approve',
  'hrm.attendance.read',
  'hrm.attendance.manage',
  'hrm.timesheet.lock',
  'hrm.payroll.read',
  'hrm.payroll.manage',
  'hrm.payroll.approve',
  'hrm.pii.view',
] as const;

export type HrPermission = (typeof HR_PERMISSIONS)[number];

export type PermissionDef = {
  code: HrPermission;
  description: string;
  sensitive: boolean;
};

const SENSITIVE = new Set<HrPermission>([
  'margin.view',
  'ai.approve',
  'website.publish',
  'pii.export',
  'price.override',
  'refund.issue',
  'stock.adjust',
  'secret.manage',
  'hr.role.manage',
  'hr.user.manage',
  'hrm.payroll.manage',
  'hrm.payroll.approve',
  'hrm.pii.view',
  'hrm.contract.manage',
]);

const DESCRIPTIONS: Record<HrPermission, string> = {
  'hr.user.read': 'Xem danh sách / chi tiết user Console',
  'hr.user.manage': 'Suspend / reactivate / reset password user',
  'hr.role.read': 'Xem role templates & permissions',
  'hr.role.manage': 'Gán / thu hồi role + data scope',
  'hr.employee.read': 'Xem hồ sơ nhân viên vận hành',
  'hr.employee.manage': 'CRUD employee + gán cửa hàng',
  'hr.invite.manage': 'Mời user mới',
  'hr.session.revoke': 'Thu hồi session đăng nhập',
  'margin.view': 'Xem contribution margin / RI nhạy cảm',
  'ai.approve': 'Duyệt AI action rủi ro cao',
  'website.edit': 'Sửa page/theme draft (CMS)',
  'website.publish': 'Publish site / page (GoLive)',
  'pii.export': 'Export PII (users/customers) — cần audit reason',
  'price.override': 'Sửa giá ngoài price list (POS/OMS)',
  'refund.issue': 'Hoàn tiền / refund',
  'stock.adjust': 'Điều chỉnh tồn kho',
  'secret.manage': 'Quản lý secret / integration keys',
  'audit.read': 'Đọc audit trail',
  'pos.shift.manage': 'Mở / đóng ca POS',
  'pos.sell': 'Bán hàng POS',
  'hrm.department.manage': 'HRM · CRUD phòng ban',
  'hrm.contract.read': 'HRM · xem HĐLĐ',
  'hrm.contract.manage': 'HRM · tạo / sửa HĐLĐ',
  'hrm.leave.read': 'HRM · xem phép / số dư',
  'hrm.leave.manage': 'HRM · tạo yêu cầu phép',
  'hrm.leave.approve': 'HRM · duyệt phép',
  'hrm.attendance.read': 'HRM · xem chấm công / roster',
  'hrm.attendance.manage': 'HRM · check-in / roster',
  'hrm.timesheet.lock': 'HRM · khóa bảng công tháng',
  'hrm.payroll.read': 'HRM · xem kỳ lương / payslip',
  'hrm.payroll.manage': 'HRM · chạy payroll draft',
  'hrm.payroll.approve': 'HRM · duyệt / paid payroll',
  'hrm.pii.view': 'HRM · xem PII lương / HĐ',
};

export const PERMISSION_CATALOG: PermissionDef[] = HR_PERMISSIONS.map((code) => ({
  code,
  description: DESCRIPTIONS[code],
  sensitive: SENSITIVE.has(code),
}));

export function isHrPermission(code: string): code is HrPermission {
  return (HR_PERMISSIONS as readonly string[]).includes(code);
}

export function isSensitivePermission(code: string): boolean {
  return isHrPermission(code) && SENSITIVE.has(code);
}

export function getPermissionDef(code: string): PermissionDef | undefined {
  return PERMISSION_CATALOG.find((p) => p.code === code);
}
