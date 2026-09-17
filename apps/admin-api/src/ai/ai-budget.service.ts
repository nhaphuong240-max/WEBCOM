import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiBudgetService {
  constructor(private readonly prisma: PrismaService) {}

  private periodYm(d = new Date()) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private defaultCap() {
    return Number(process.env.AI_TENANT_BUDGET_USD || 5);
  }

  async getBudget(tenantId: string) {
    const periodYm = this.periodYm();
    const row = await this.prisma.db.aiBudgetLedger.findUnique({
      where: { tenantId_periodYm: { tenantId, periodYm } },
    });
    const cap = row ? Number(row.capUsd) : this.defaultCap();
    const spent = row ? Number(row.spentUsd) : 0;
    return {
      tenant_id: tenantId,
      period_ym: periodYm,
      spent_usd: spent,
      cap_usd: cap,
      remaining_usd: Math.max(0, Math.round((cap - spent) * 1e6) / 1e6),
    };
  }

  async assertAndCharge(tenantId: string, costUsd: number) {
    const periodYm = this.periodYm();
    const cap = this.defaultCap();
    const existing = await this.prisma.db.aiBudgetLedger.findUnique({
      where: { tenantId_periodYm: { tenantId, periodYm } },
    });
    const spent = existing ? Number(existing.spentUsd) : 0;
    const effectiveCap = existing ? Number(existing.capUsd) : cap;
    if (spent + costUsd > effectiveCap) {
      throw AppError.validation('AI budget exceeded', {
        code: 'AI_BUDGET_EXCEEDED',
        spent_usd: spent,
        cap_usd: effectiveCap,
        need_usd: costUsd,
      });
    }
    if (existing) {
      await this.prisma.db.aiBudgetLedger.update({
        where: { id: existing.id },
        data: { spentUsd: new Prisma.Decimal(spent + costUsd) },
      });
    } else {
      await this.prisma.db.aiBudgetLedger.create({
        data: {
          id: createId('aib'),
          tenantId,
          periodYm,
          spentUsd: costUsd,
          capUsd: cap,
        },
      });
    }
    return this.getBudget(tenantId);
  }
}
