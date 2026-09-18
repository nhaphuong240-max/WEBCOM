import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaymentService } from '../payment/payment.service';

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

function themePriceVnd(license: string): number {
  if (license === 'free') return 0;
  return Number(process.env.THEME_LICENSE_PRICE_VND || 1990000);
}

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly payments: PaymentService,
  ) {}

  status() {
    return {
      wave: 'P3',
      features: {
        theme_license: true,
        vietqr_transfer: true,
        separate_from_merchant_order: true,
        simulate_paid: true,
      },
      default_price_vnd: themePriceVnd('one_time'),
    };
  }

  async listLicenses(tenantId: string) {
    const rows = await this.prisma.db.themeLicense.findMany({
      where: { tenantId },
      include: { template: true },
      orderBy: { grantedAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      template_id: r.templateId,
      template_code: r.template.code,
      template_name: r.template.name,
      status: r.status,
      invoice_id: r.invoiceId,
      granted_at: r.grantedAt.toISOString(),
    }));
  }

  async quote(tenantId: string, templateCode: string) {
    const tpl = await this.requireTemplate(templateCode);
    const existing = await this.prisma.db.themeLicense.findFirst({
      where: { tenantId, templateId: tpl.id, status: 'active' },
    });
    const amount = themePriceVnd(tpl.license);
    return {
      template_id: tpl.id,
      template_code: tpl.code,
      template_name: tpl.name,
      license: tpl.license,
      amount: money(amount),
      currency: 'VND',
      already_licensed: Boolean(existing),
      requires_payment: tpl.license !== 'free' && !existing,
    };
  }

  async createInvoice(tenantId: string, templateCode: string, actorId?: string) {
    const tpl = await this.requireTemplate(templateCode);
    if (tpl.license === 'free') {
      const lic = await this.grantLicense(tenantId, tpl.id, null, actorId);
      return {
        invoice_id: null,
        status: 'paid',
        amount: money(0),
        currency: 'VND',
        qr_image_url: null,
        transfer_content: null,
        license: lic,
        note: 'Free template — license granted',
      };
    }

    const existing = await this.prisma.db.themeLicense.findFirst({
      where: { tenantId, templateId: tpl.id, status: 'active' },
    });
    if (existing) {
      throw AppError.conflict('Theme already licensed');
    }

    const open = await this.prisma.db.platformInvoice.findFirst({
      where: { tenantId, templateId: tpl.id, status: 'open' },
      orderBy: { createdAt: 'desc' },
    });
    if (open) return this.mapInvoice(open, tpl.code);

    const amount = themePriceVnd(tpl.license);
    const invoiceId = createId('pinv');
    const short = invoiceId.replace(/^pinv_/, '').slice(0, 10).toUpperCase();
    const content = `PTT THEME ${short}`.slice(0, 25);
    const built = this.payments.buildVietQr({ orderId: invoiceId, amount, content });

    const row = await this.prisma.db.platformInvoice.create({
      data: {
        id: invoiceId,
        tenantId,
        templateId: tpl.id,
        amount,
        currency: 'VND',
        status: 'open',
        qrPayload: built.qrPayload,
        qrImageUrl: built.qrImageUrl,
        transferContent: built.transferContent,
        providerRef: built.providerRef,
      },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'billing.invoice_create',
      entity: 'platform_invoice',
      entityId: row.id,
      payload: { template_code: tpl.code, amount },
    });

    return this.mapInvoice(row, tpl.code);
  }

  async getInvoice(tenantId: string, id: string) {
    const row = await this.prisma.db.platformInvoice.findFirst({
      where: { id, tenantId },
      include: { template: true, license: true },
    });
    if (!row) throw AppError.notFound('Invoice not found');
    return {
      ...this.mapInvoice(row, row.template.code),
      license_id: row.license?.id ?? null,
    };
  }

  async simulatePaid(tenantId: string, invoiceId: string, actorId?: string) {
    const row = await this.prisma.db.platformInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    if (!row) throw AppError.notFound('Invoice not found');
    if (row.status === 'paid') {
      const lic = await this.prisma.db.themeLicense.findFirst({
        where: { tenantId, templateId: row.templateId },
      });
      return { invoice: this.mapInvoice(row), license: lic, deduped: true };
    }
    return this.markPaid(tenantId, row.id, actorId);
  }

  async markPaid(tenantId: string, invoiceId: string, actorId?: string) {
    const row = await this.prisma.db.platformInvoice.update({
      where: { id: invoiceId },
      data: { status: 'paid', paidAt: new Date() },
      include: { template: true },
    });
    const lic = await this.grantLicense(tenantId, row.templateId, row.id, actorId);
    await this.audit.write({
      tenantId,
      actorId,
      action: 'billing.invoice_paid',
      entity: 'platform_invoice',
      entityId: row.id,
      payload: { template_code: row.template.code, license_id: lic.id },
    });
    return {
      invoice: this.mapInvoice(row, row.template.code),
      license: lic,
      deduped: false,
    };
  }

  async hasActiveLicense(tenantId: string, templateIdOrCode: string): Promise<boolean> {
    const tpl = await this.prisma.db.templateCatalog.findFirst({
      where: {
        OR: [{ id: templateIdOrCode }, { code: templateIdOrCode }],
        active: true,
      },
    });
    if (!tpl) return false;
    if (tpl.license === 'free') return true;
    const lic = await this.prisma.db.themeLicense.findFirst({
      where: { tenantId, templateId: tpl.id, status: 'active' },
    });
    return Boolean(lic);
  }

  private async grantLicense(
    tenantId: string,
    templateId: string,
    invoiceId: string | null,
    actorId?: string,
  ) {
    const existing = await this.prisma.db.themeLicense.findFirst({
      where: { tenantId, templateId },
    });
    if (existing) {
      return this.prisma.db.themeLicense.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          invoiceId: invoiceId ?? existing.invoiceId,
          grantedAt: new Date(),
        },
      });
    }
    const lic = await this.prisma.db.themeLicense.create({
      data: {
        id: createId('tlic'),
        tenantId,
        templateId,
        invoiceId,
        status: 'active',
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'billing.license_grant',
      entity: 'theme_license',
      entityId: lic.id,
      payload: { template_id: templateId, invoice_id: invoiceId },
    });
    return lic;
  }

  private async requireTemplate(codeOrId: string) {
    const tpl = await this.prisma.db.templateCatalog.findFirst({
      where: {
        active: true,
        OR: [{ id: codeOrId }, { code: codeOrId }],
      },
    });
    if (!tpl) throw AppError.notFound('Template not found');
    return tpl;
  }

  private mapInvoice(
    row: {
      id: string;
      templateId: string;
      amount: Prisma.Decimal;
      currency: string;
      status: string;
      qrImageUrl: string | null;
      qrPayload: string | null;
      transferContent: string | null;
      providerRef: string | null;
      paidAt: Date | null;
      createdAt: Date;
    },
    templateCode?: string,
  ) {
    return {
      invoice_id: row.id,
      template_id: row.templateId,
      template_code: templateCode,
      amount: money(row.amount),
      currency: row.currency,
      status: row.status,
      qr_image_url: row.qrImageUrl,
      qr_payload: row.qrPayload,
      transfer_content: row.transferContent,
      provider_ref: row.providerRef,
      paid_at: row.paidAt?.toISOString() ?? null,
      created_at: row.createdAt.toISOString(),
    };
  }
}
