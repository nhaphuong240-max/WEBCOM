import { describe, expect, it } from 'vitest';
import {
  createId,
  err,
  normalizeLimit,
  ok,
  PERMISSION_CATALOG,
  ROLE_TEMPLATES,
  resolvePermissions,
  roleHasPermission,
  hasPermission,
  isSensitivePermission,
  getRoleTemplate,
} from './index';

describe('shared-kernel', () => {
  it('creates prefixed ids', () => {
    const id = createId('ten');
    expect(id.startsWith('ten_')).toBe(true);
  });

  it('result helpers', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('x').ok).toBe(false);
  });

  it('normalizes page limit', () => {
    expect(normalizeLimit(undefined)).toBe(20);
    expect(normalizeLimit(500)).toBe(100);
    expect(normalizeLimit(0)).toBe(20);
  });
});

describe('HR-0 permission catalog', () => {
  it('has stable permission codes and sensitive flags', () => {
    expect(PERMISSION_CATALOG.length).toBeGreaterThanOrEqual(20);
    expect(isSensitivePermission('website.publish')).toBe(true);
    expect(isSensitivePermission('website.edit')).toBe(false);
    expect(isSensitivePermission('not.a.perm')).toBe(false);
  });

  it('owner resolves all permissions; editor cannot publish', () => {
    const owner = resolvePermissions(['owner']);
    expect(owner).toContain('secret.manage');
    expect(owner).toContain('website.publish');

    expect(roleHasPermission(['website_editor'], 'website.edit')).toBe(true);
    expect(roleHasPermission(['website_editor'], 'website.publish')).toBe(false);
    expect(roleHasPermission(['website_publisher'], 'website.publish')).toBe(true);
  });

  it('admin excludes secret.manage', () => {
    expect(roleHasPermission(['admin'], 'hr.user.manage')).toBe(true);
    expect(roleHasPermission(['admin'], 'secret.manage')).toBe(false);
  });

  it('hasPermission checks effective set', () => {
    const eff = resolvePermissions(['cashier']);
    expect(hasPermission(eff, 'pos.sell')).toBe(true);
    expect(hasPermission(eff, ['pos.sell', 'pos.shift.manage'])).toBe(true);
    expect(hasPermission(eff, 'margin.view')).toBe(false);
  });

  it('lists system role templates', () => {
    const codes = ROLE_TEMPLATES.map((r) => r.code);
    for (const c of [
      'owner',
      'admin',
      'ops',
      'store_manager',
      'cashier',
      'website_editor',
      'website_publisher',
      'analyst',
      'readonly',
    ]) {
      expect(codes).toContain(c);
      expect(getRoleTemplate(c)?.system).toBe(true);
    }
  });
});
