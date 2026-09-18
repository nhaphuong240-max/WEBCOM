import { describe, expect, it } from 'vitest';
import {
  getPackage,
  listPackageCodes,
  normalizeContent,
  toLegacyFlat,
  validateContentV1,
} from './index';

describe('normalizeContent', () => {
  it('round-trips legacy flat', () => {
    const legacy = {
      section_order: ['hero', 'trust'],
      hero: { eyebrow: 'A', headline: 'H', cta: 'Go', cta_href: '/' },
      trust: ['COD', 'Đổi trả'],
    };
    const v1 = normalizeContent(legacy);
    expect(v1.schema_version).toBe(1);
    expect(v1.sections.hero.props.headline).toBe('H');
    expect(v1.sections.trust.props.items).toEqual(['COD', 'Đổi trả']);
    const back = toLegacyFlat(v1);
    expect(back.hero).toMatchObject({ headline: 'H' });
    expect(back.trust).toEqual(['COD', 'Đổi trả']);
  });

  it('rejects unknown section type', () => {
    const bad = normalizeContent({
      schema_version: 1,
      section_order: ['x'],
      sections: { x: { type: 'not_a_real_type', id: '1', props: {} } },
    });
    const issues = validateContentV1(bad);
    expect(issues.some((i) => i.message.includes('unknown'))).toBe(true);
  });
});

describe('theme packages', () => {
  it('lists 3 pilot codes', () => {
    const codes = listPackageCodes();
    expect(codes).toEqual(['aura-commerce-lite', 'live-drop', 'lumen-fashion']);
  });

  it('loads and validates each package', () => {
    for (const code of listPackageCodes()) {
      const pkg = getPackage(code);
      expect(pkg.manifest.code).toBe(code);
      expect(pkg.starter.home.schema_version).toBe(1);
      expect(pkg.starter.tokens.accent).toBeTruthy();
      expect(validateContentV1(pkg.starter.home)).toEqual([]);
    }
  });

  it('pilot packages differ in headline', () => {
    const a = getPackage('aura-commerce-lite').starter.home.sections.hero.props.headline;
    const b = getPackage('lumen-fashion').starter.home.sections.hero.props.headline;
    const c = getPackage('live-drop').starter.home.sections.hero.props.headline;
    expect(new Set([a, b, c]).size).toBe(3);
  });
});
