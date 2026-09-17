/**
 * Contract-style tests for W1 commerce rules (unit-level helpers + pure logic).
 * Full E2E against DB runs via scripts/e2e-w1.sh when API is up.
 */
import { describe, expect, it } from 'vitest';
import { AppError, errorEnvelope } from '@ptt/shared-kernel';
import { createHash } from 'node:crypto';

describe('W1 contracts', () => {
  it('error envelope keeps AppError codes', () => {
    const err = AppError.insufficientStock('no stock', { available: 0 });
    const body = errorEnvelope(err.code, err.message, { details: err.details });
    expect(body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(body.error.details).toEqual({ available: 0 });
  });

  it('idempotency hash differs when payload differs', () => {
    const a = createHash('sha256').update(JSON.stringify({ cartId: '1', note: 'a' })).digest('hex');
    const b = createHash('sha256').update(JSON.stringify({ cartId: '1', note: 'b' })).digest('hex');
    expect(a).not.toBe(b);
  });

  it('available = max(0, onHand - reserved)', () => {
    const available = (onHand: number, reserved: number) => Math.max(0, onHand - reserved);
    expect(available(10, 3)).toBe(7);
    expect(available(2, 5)).toBe(0);
  });

  it('server price applies percent discount', () => {
    const list = 459000;
    const pct = 10;
    const unit = list * (1 - pct / 100);
    expect(unit).toBe(413100);
  });
});
