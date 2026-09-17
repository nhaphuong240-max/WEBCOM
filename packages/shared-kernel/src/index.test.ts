import { describe, expect, it } from 'vitest';
import { createId, err, normalizeLimit, ok } from './index';

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
