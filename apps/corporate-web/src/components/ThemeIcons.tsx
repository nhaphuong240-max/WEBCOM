/** Line icons for marketplace industries — inline SVG, no emoji. */

import type { ReactElement, ReactNode } from 'react';

type IconProps = { className?: string };

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconFashion({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 4l3 2 3-3 3 3 3-2 2 5-3 1v10H7V10L4 9l2-5z" />
    </Svg>
  );
}

export function IconElectronics({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </Svg>
  );
}

export function IconBeauty({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3c2.5 3 4 5.5 4 8a4 4 0 11-8 0c0-2.5 1.5-5 4-8z" />
      <path d="M9 20h6" />
    </Svg>
  );
}

export function IconBusiness({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="8" width="18" height="13" rx="1.5" />
      <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18" />
    </Svg>
  );
}

export function IconHome({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" />
    </Svg>
  );
}

export function IconJewelry({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3l3 5-3 13L9 8l3-5z" />
      <path d="M9 8h6" />
    </Svg>
  );
}

export function IconFood({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 11h16v2a8 8 0 01-16 0v-2z" />
      <path d="M8 11V7M12 11V5M16 11V7" />
    </Svg>
  );
}

export function IconHealth({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z" />
    </Svg>
  );
}

export function IconPets({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="8" cy="8" r="1.6" />
      <circle cx="16" cy="8" r="1.6" />
      <circle cx="6" cy="13" r="1.5" />
      <circle cx="18" cy="13" r="1.5" />
      <ellipse cx="12" cy="16.5" rx="3.2" ry="2.6" />
    </Svg>
  );
}

export function IconShop({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 8l1.5-4h13L20 8" />
      <path d="M5 8h14v11a1 1 0 01-1 1H6a1 1 0 01-1-1V8z" />
      <path d="M9 12v4M15 12v4" />
    </Svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Svg>
  );
}

export function IconExternal({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M10 5H5a1 1 0 00-1 1v13a1 1 0 001 1h13a1 1 0 001-1v-5" />
    </Svg>
  );
}

export function IconSpark({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    </Svg>
  );
}

export const INDUSTRY_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  fashion: IconFashion,
  electronics: IconElectronics,
  beauty: IconBeauty,
  b2b: IconBusiness,
  home: IconHome,
  jewelry: IconJewelry,
  fnb: IconFood,
  health: IconHealth,
  pets: IconPets,
  general: IconShop,
};
