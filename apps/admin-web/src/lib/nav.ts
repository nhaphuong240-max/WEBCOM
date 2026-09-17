export const websiteNav = [
  { href: '/website/onboarding', label: 'Onboarding', mockup: '02' },
  { href: '/website/templates', label: 'Template Store', mockup: '04' },
  { href: '/website/themes', label: 'Theme Library', mockup: '05' },
  { href: '/website/builder', label: 'Site Builder', mockup: '06' },
  { href: '/website/golive', label: 'Go-live', mockup: '07' },
  { href: '/website/analytics', label: 'Web Analytics', mockup: '09' },
] as const;

export const mainNav = [
  { href: '/', label: 'Command Center', section: 'Điều hành' },
  { href: '/products', label: 'Sản phẩm', section: 'Điều hành' },
  { href: '/orders', label: 'Đơn hàng', section: 'Điều hành' },
  { href: '/inventory', label: 'Tồn kho', section: 'Điều hành' },
  ...websiteNav.map((i) => ({ ...i, section: 'Website' as const })),
  { href: '/design-system', label: 'Design system', section: 'Website' },
  { href: '/social', label: 'Social / Live', section: 'Tăng trưởng' },
  { href: '/revenue', label: 'Revenue', section: 'Trí tuệ' },
] as const;
