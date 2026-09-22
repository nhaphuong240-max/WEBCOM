export type MegaColumn = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

export type MegaPanel = {
  columns?: MegaColumn[];
  featured_collections?: Array<{ slug: string; title: string }>;
  featured_products?: Array<{ id?: string; slug: string; title: string; image?: string }>;
};

export type NavLink = {
  label: string;
  href: string;
  mega?: MegaPanel;
};

export function hasMega(item: NavLink | undefined): boolean {
  if (!item?.mega) return false;
  const m = item.mega;
  return !!(
    (m.columns && m.columns.length) ||
    (m.featured_collections && m.featured_collections.length) ||
    (m.featured_products && m.featured_products.length)
  );
}
