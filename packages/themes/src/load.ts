import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { normalizeContent, toLegacyFlat, validateContentV1 } from './normalize';
import type { ContentV1, ThemePackage, ThemePackageManifest } from './types';

function packageRoot(): string {
  // dist/ → .. ; src/ (tsx) → ..
  return join(__dirname, '..');
}

function catalogRoot(): string {
  return join(packageRoot(), 'catalog');
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function listPackageCodes(): string[] {
  const root = catalogRoot();
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

export function getPackage(code: string): ThemePackage {
  const dir = join(catalogRoot(), code);
  if (!existsSync(dir)) {
    throw new Error(`Theme package not found: ${code}`);
  }
  const manifest = readJson<ThemePackageManifest>(join(dir, 'package.manifest.json'));
  const homeRaw = readJson<unknown>(join(dir, 'starter', 'home.json'));
  const tokens = readJson<Record<string, string>>(join(dir, 'starter', 'tokens.json'));
  const home = normalizeContent(homeRaw) as ContentV1;

  const issues = validateContentV1(home);
  if (issues.length) {
    throw new Error(`Invalid starter for ${code}: ${issues.map((i) => i.message).join('; ')}`);
  }

  for (const key of home.section_order) {
    const type = home.sections[key]?.type;
    if (type && !manifest.supports.includes(type)) {
      throw new Error(`Package ${code}: section type "${type}" not in supports[]`);
    }
  }

  return {
    manifest: {
      ...manifest,
      code: manifest.code || code,
    },
    starter: { home, tokens },
  };
}

export function getStarter(code: string) {
  return getPackage(code).starter;
}

export function listPackages(): ThemePackage[] {
  return listPackageCodes().map((code) => getPackage(code));
}

export function hasPackage(code: string): boolean {
  return existsSync(join(catalogRoot(), code, 'package.manifest.json'));
}

/** Catalog denormalize helpers for seed / install */
export function packageToThemeConfig(pkg: ThemePackage) {
  return {
    code: pkg.manifest.code,
    package_version: pkg.manifest.version,
    supports: pkg.manifest.supports,
    tokens: {
      accent: pkg.starter.tokens.accent,
      rose: pkg.starter.tokens.rose || pkg.starter.tokens.accent,
      ink: pkg.starter.tokens.ink || '#1a1214',
      cream: pkg.starter.tokens.cream || '#faf6f4',
    },
    sections: {
      home: pkg.manifest.layouts.home || pkg.starter.home.section_order,
    },
    collections: [
      { slug: 'noi-bat', title: 'Nổi bật' },
      { slug: 'moi', title: 'Mới' },
    ],
  };
}

export function packageToPageContent(pkg: ThemePackage) {
  return pkg.starter.home;
}

export function packageToLegacyPageContent(pkg: ThemePackage) {
  return toLegacyFlat(pkg.starter.home);
}
