import { Prisma } from '@prisma/client';

export const PAYSLIP_DISCLAIMER =
  'Ước tính BHXH/PIT — không thay thế tư vấn thuế.';

export function dec(v: number | string | Prisma.Decimal | { toNumber(): number }): number {
  if (v instanceof Prisma.Decimal) return v.toNumber();
  if (typeof v === 'object' && v && typeof (v as { toNumber?: unknown }).toNumber === 'function') {
    return (v as { toNumber(): number }).toNumber();
  }
  return Number(v);
}

export function toDec(v: number): Prisma.Decimal {
  return new Prisma.Decimal(v.toFixed(2));
}

export function parseDateOnly(raw: string): Date {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error('invalid date');
  return d;
}

/** Inclusive calendar days between two dates. */
export function calendarDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

/** VN progressive PIT on annual taxable income; returns monthly PIT. */
export function calcProgressivePitMonthly(
  taxableMonthly: number,
  personalDeductionAnnual: number,
): number {
  const taxableAnnual = Math.max(0, taxableMonthly * 12 - personalDeductionAnnual);
  const brackets = [
    { limit: 5_000_000, rate: 0.05 },
    { limit: 10_000_000, rate: 0.1 },
    { limit: 18_000_000, rate: 0.15 },
    { limit: 32_000_000, rate: 0.2 },
    { limit: 52_000_000, rate: 0.25 },
    { limit: 80_000_000, rate: 0.3 },
    { limit: Infinity, rate: 0.35 },
  ];
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (taxableAnnual <= prev) break;
    const inBand = Math.min(taxableAnnual, b.limit) - prev;
    tax += inBand * b.rate;
    prev = b.limit;
  }
  return tax / 12;
}

export function sumAllowances(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;
  return Object.values(raw as Record<string, unknown>).reduce<number>((sum, v) => {
    const n = Number(v);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}
