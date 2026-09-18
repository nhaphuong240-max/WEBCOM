export { SECTION_REGISTRY, SECTION_KEYS, getSectionDef } from './registry';
export type { SectionKey } from './registry';
export {
  normalizeContent,
  toLegacyFlat,
  validateContentV1,
  assertValidContent,
  ensureSectionIds,
} from './normalize';
export type { ValidateIssue } from './normalize';
export {
  listPackageCodes,
  listPackages,
  getPackage,
  getStarter,
  hasPackage,
  packageToThemeConfig,
  packageToPageContent,
  packageToLegacyPageContent,
} from './load';
export type {
  ContentV1,
  SectionNode,
  ThemePackage,
  ThemePackageManifest,
} from './types';
