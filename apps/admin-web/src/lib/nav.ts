export const websiteNav = [
  { href: '/website/builder', label: 'CMS · Site Builder', mockup: '06' },
  { href: '/website/settings', label: 'Thiết lập website', mockup: 'SET' },
  { href: '/website/collections', label: 'Bộ sưu tập (merch)', mockup: 'PLP' },
  { href: '/website/leads', label: 'Leads', mockup: 'LEAD' },
  { href: '/website/templates', label: 'Template Store', mockup: '04' },
  { href: '/website/themes', label: 'Theme Library', mockup: '05' },
  { href: '/website/golive', label: 'Go-live', mockup: '07' },
  { href: '/website/onboarding', label: 'Onboarding', mockup: '02' },
  { href: '/platform/pages', label: 'Platform CMS (GTM)', mockup: 'PCMS' },
  { href: '/platform/nav', label: 'Platform Nav', mockup: 'PCMS' },
  { href: '/website/creator', label: 'Creator Portal', mockup: 'C3' },
  { href: '/website/domains', label: 'Domain / SSL', mockup: 'A1' },
  { href: '/website/analytics', label: 'Web Analytics', mockup: '09' },
  { href: '/website/agency', label: 'Agency / Headless', mockup: 'W5' },
] as const;

export const hrNav = [
  { href: '/hr/users', label: 'Users', mockup: 'HR' },
  { href: '/hr/employees', label: 'Employees', mockup: 'HR' },
  { href: '/hr/roles', label: 'Roles', mockup: 'HR' },
  { href: '/hr/shifts', label: 'Shifts', mockup: 'HR' },
  { href: '/hr/sessions', label: 'Login history', mockup: 'HR' },
] as const;

export const hrmNav = [
  { href: '/hrm', label: 'HRM home', mockup: 'HRM' },
  { href: '/hrm/departments', label: 'Departments', mockup: 'HRM' },
  { href: '/hrm/contracts', label: 'Contracts', mockup: 'HRM' },
  { href: '/hrm/leave', label: 'Leave', mockup: 'HRM' },
  { href: '/hrm/attendance', label: 'Attendance', mockup: 'HRM' },
  { href: '/hrm/payroll', label: 'Payroll', mockup: 'HRM' },
] as const;

export const mainNav = [
  { href: '/', label: 'Command Center', section: 'Điều hành' },
  { href: '/products', label: 'Sản phẩm', section: 'Điều hành' },
  { href: '/orders', label: 'Đơn hàng', section: 'Điều hành' },
  { href: '/customers', label: 'Customers', section: 'Điều hành' },
  { href: '/customers/matches', label: 'Identity matches', section: 'Điều hành' },
  { href: '/segments', label: 'Segments', section: 'Điều hành' },
  { href: '/loyalty', label: 'Loyalty', section: 'Điều hành' },
  { href: '/journeys', label: 'Journeys', section: 'Điều hành' },
  { href: '/recovery', label: 'Recovery', section: 'Điều hành' },
  { href: '/inventory', label: 'Tồn kho', section: 'Điều hành' },
  // Website/CMS lên trước HR để dễ tìm trên VPS
  ...websiteNav.map((i) => ({ ...i, section: 'Website · CMS' as const })),
  { href: '/design-system', label: 'Design system', section: 'Website · CMS' as const },
  ...hrNav.map((i) => ({ ...i, section: 'Nhân sự' as const })),
  ...hrmNav.map((i) => ({ ...i, section: 'HRM' as const })),
  { href: '/social', label: 'Social Inbox', section: 'Tăng trưởng' },
  { href: '/live', label: 'Live Commerce', section: 'Tăng trưởng' },
  { href: '/marketplace', label: 'Marketplace', section: 'Tăng trưởng' },
  { href: '/pos', label: 'POS', section: 'Tăng trưởng' },
  { href: '/revenue', label: 'Revenue', section: 'Trí tuệ' },
] as const;
