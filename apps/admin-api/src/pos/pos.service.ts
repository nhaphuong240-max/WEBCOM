import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PricingService } from '../catalog/catalog.service';
import { PaymentService } from '../payment/payment.service';

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

type Tender = 'cash' | 'COD' | 'TRANSFER';

type SaleLineIn = { sku_id: string; qty: number; unit_price?: number };

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService,
    private readonly payments: PaymentService,
  ) {}

  status() {
    return {
      wave: 'B3',
      features: {
        location_register_shift: true,
        barcode_search: true,
        split_payment: true,
        location_inventory_sync: true,
        basic_return: true,
        receipt: true,
      },
      nfr: { barcode_search_p95_ms_target: 500 },
    };
  }

  /** Bootstrap 1 store + register for tenant (idempotent). */
  async ensureStore(
    tenantId: string,
    input?: { code?: string; name?: string; address?: string; city?: string; register_code?: string },
    actorId?: string,
  ) {
    const code = input?.code || 'store_q1';
    let loc = await this.prisma.db.posLocation.findFirst({ where: { tenantId, code } });
    if (!loc) {
      loc = await this.prisma.db.posLocation.create({
        data: {
          id: createId('ploc'),
          tenantId,
          code,
          name: input?.name || 'AURA Store Q1',
          address: input?.address || '1 Nguyen Hue',
          city: input?.city || 'HCM',
          status: 'active',
        },
      });
      await this.audit.write({
        tenantId,
        actorId,
        action: 'pos.location_create',
        entity: 'pos_location',
        entityId: loc.id,
      });
    }

    const regCode = input?.register_code || 'reg_1';
    let reg = await this.prisma.db.posRegister.findFirst({
      where: { locationId: loc.id, code: regCode },
    });
    if (!reg) {
      reg = await this.prisma.db.posRegister.create({
        data: {
          id: createId('preg'),
          tenantId,
          locationId: loc.id,
          code: regCode,
          name: `Register ${regCode}`,
          status: 'active',
        },
      });
    }

    await this.syncLocationStockFromGlobal(tenantId, loc.id);

    return {
      location: this.mapLocation(loc),
      register: this.mapRegister(reg),
    };
  }

  async listLocations(tenantId: string) {
    const rows = await this.prisma.db.posLocation.findMany({
      where: { tenantId },
      include: { registers: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      ...this.mapLocation(r),
      registers: r.registers.map((g) => this.mapRegister(g)),
    }));
  }

  async openShift(
    tenantId: string,
    input: { register_id: string; opening_cash?: number; cashier_id?: string; note?: string },
    actorId?: string,
  ) {
    const reg = await this.prisma.db.posRegister.findFirst({
      where: { id: input.register_id, tenantId, status: 'active' },
      include: { location: true },
    });
    if (!reg) throw AppError.notFound('Register not found');

    const open = await this.prisma.db.posShift.findFirst({
      where: { tenantId, registerId: reg.id, status: 'open' },
    });
    if (open) throw AppError.conflict('Register already has an open shift', { shift_id: open.id });

    const cashierId = input.cashier_id || actorId || 'cashier';
    const shift = await this.prisma.db.posShift.create({
      data: {
        id: createId('psh'),
        tenantId,
        locationId: reg.locationId,
        registerId: reg.id,
        cashierId,
        status: 'open',
        openingCash: input.opening_cash ?? 0,
        note: input.note || '',
        tenderSummary: { cash: 0, COD: 0, TRANSFER: 0 },
      },
    });

    await this.syncLocationStockFromGlobal(tenantId, reg.locationId);

    await this.audit.write({
      tenantId,
      actorId: cashierId,
      action: 'pos.shift_open',
      entity: 'pos_shift',
      entityId: shift.id,
      payload: { register_id: reg.id, opening_cash: input.opening_cash ?? 0 },
    });

    return this.mapShift(shift);
  }

  async getOpenShift(tenantId: string, registerId: string) {
    const shift = await this.prisma.db.posShift.findFirst({
      where: { tenantId, registerId, status: 'open' },
      orderBy: { openedAt: 'desc' },
    });
    return shift ? this.mapShift(shift) : null;
  }

  async closeShift(
    tenantId: string,
    shiftId: string,
    input: { closing_cash: number; note?: string },
    actorId?: string,
  ) {
    const shift = await this.prisma.db.posShift.findFirst({ where: { id: shiftId, tenantId } });
    if (!shift) throw AppError.notFound('Shift not found');
    if (shift.status !== 'open') throw AppError.conflict('Shift already closed');

    const tender = (shift.tenderSummary || {}) as Record<string, number>;
    const cashSales = Number(tender.cash || 0);
    const expected = Number(shift.openingCash) + cashSales - Number(shift.returnsTotal);
    const closing = Number(input.closing_cash);
    const variance = closing - expected;

    const updated = await this.prisma.db.posShift.update({
      where: { id: shift.id },
      data: {
        status: 'closed',
        closingCash: closing,
        expectedCash: expected,
        cashVariance: variance,
        closedAt: new Date(),
        note: input.note ?? shift.note,
      },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'pos.shift_close',
      entity: 'pos_shift',
      entityId: shift.id,
      payload: { expected_cash: expected, closing_cash: closing, variance },
    });

    return {
      ...this.mapShift(updated),
      report: {
        sales_count: updated.salesCount,
        sales_total: money(updated.salesTotal),
        returns_count: updated.returnsCount,
        returns_total: money(updated.returnsTotal),
        tender_summary: updated.tenderSummary,
        opening_cash: money(updated.openingCash),
        expected_cash: money(expected),
        closing_cash: money(closing),
        cash_variance: money(variance),
      },
    };
  }

  /**
   * Barcode / SKU search — target P95 ≤ 500ms (NFR-PERF-002).
   */
  async lookup(
    tenantId: string,
    q: string,
    locationId?: string,
  ) {
    const started = Date.now();
    const term = q.trim();
    if (!term) throw AppError.validation('q required');

    const sku = await this.prisma.db.sku.findFirst({
      where: {
        tenantId,
        status: 'active',
        OR: [
          { barcode: term },
          { code: { equals: term, mode: 'insensitive' } },
          { code: { contains: term, mode: 'insensitive' } },
          { variant: { product: { title: { contains: term, mode: 'insensitive' } } } },
        ],
      },
      include: {
        inventory: true,
        variant: { include: { product: true } },
      },
    });
    if (!sku) throw AppError.notFound('SKU not found');

    const price = await this.pricing.resolveUnitPrice(tenantId, sku.id);
    const globalOn = sku.inventory?.onHand ?? 0;
    const globalRes = sku.inventory?.reserved ?? 0;
    const globalAvail = Math.max(0, globalOn - globalRes);

    let locationOnHand: number | null = null;
    if (locationId) {
      const locInv = await this.prisma.db.locationInventory.findFirst({
        where: { tenantId, locationId, skuId: sku.id },
      });
      locationOnHand = locInv?.onHand ?? 0;
    }

    const latencyMs = Date.now() - started;
    return {
      sku_id: sku.id,
      sku_code: sku.code,
      barcode: sku.barcode,
      product_title: sku.variant.product.title,
      variant_title: sku.variant.title,
      unit_price: money(price.unitPrice),
      currency: price.currency,
      available_global: globalAvail,
      on_hand_global: globalOn,
      reserved_global: globalRes,
      on_hand_location: locationOnHand,
      available_pos: locationOnHand == null ? globalAvail : Math.min(locationOnHand, globalAvail),
      latency_ms: latencyMs,
      within_slo: latencyMs <= 500,
    };
  }

  async getLocationStock(tenantId: string, locationId: string) {
    const loc = await this.prisma.db.posLocation.findFirst({ where: { id: locationId, tenantId } });
    if (!loc) throw AppError.notFound('Location not found');
    const rows = await this.prisma.db.locationInventory.findMany({
      where: { tenantId, locationId },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    const global = await this.prisma.db.inventoryBalance.findMany({
      where: { tenantId, skuId: { in: rows.map((r) => r.skuId) } },
    });
    const gmap = new Map(global.map((g) => [g.skuId, g]));
    return rows.map((r) => {
      const g = gmap.get(r.skuId);
      return {
        sku_id: r.skuId,
        on_hand_location: r.onHand,
        on_hand_global: g?.onHand ?? 0,
        reserved_global: g?.reserved ?? 0,
        available_global: Math.max(0, (g?.onHand ?? 0) - (g?.reserved ?? 0)),
        consistent: g ? r.onHand <= g.onHand : false,
      };
    });
  }

  async createSale(
    tenantId: string,
    input: {
      shift_id: string;
      lines: SaleLineIn[];
      payments: Array<{ method: Tender; amount: number }>;
      customer_name?: string;
      customer_phone?: string;
      discount_amount?: number;
      note?: string;
    },
    actorId?: string,
  ) {
    if (!input.lines?.length) throw AppError.validation('lines required');
    if (!input.payments?.length) throw AppError.validation('payments required');

    const shift = await this.prisma.db.posShift.findFirst({
      where: { id: input.shift_id, tenantId },
      include: { location: true, register: true },
    });
    if (!shift) throw AppError.notFound('Shift not found');
    if (shift.status !== 'open') throw AppError.conflict('Shift is closed');

    const snapshots: Array<{
      sku_id: string;
      sku_code: string;
      product_title: string;
      qty: number;
      unit_price: string;
      line_total: string;
    }> = [];
    let subtotal = new Prisma.Decimal(0);

    for (const line of input.lines) {
      if (line.qty < 1) throw AppError.validation('qty must be >= 1');
      const sku = await this.prisma.db.sku.findFirst({
        where: { id: line.sku_id, tenantId, status: 'active' },
        include: { inventory: true, variant: { include: { product: true } } },
      });
      if (!sku) throw AppError.notFound(`SKU not found: ${line.sku_id}`);
      const price = line.unit_price != null
        ? { unitPrice: new Prisma.Decimal(line.unit_price), currency: 'VND' }
        : await this.pricing.resolveUnitPrice(tenantId, sku.id);
      const lineTotal = price.unitPrice.mul(line.qty);
      subtotal = subtotal.add(lineTotal);
      snapshots.push({
        sku_id: sku.id,
        sku_code: sku.code,
        product_title: sku.variant.product.title,
        qty: line.qty,
        unit_price: money(price.unitPrice),
        line_total: money(lineTotal),
      });
    }

    const discount = new Prisma.Decimal(input.discount_amount ?? 0);
    const total = Prisma.Decimal.max(0, subtotal.sub(discount));
    const paySum = input.payments.reduce((a, p) => a + Number(p.amount), 0);
    if (Math.abs(paySum - Number(total)) > 0.02) {
      throw AppError.validation('payments must equal total', {
        total: money(total),
        payments_sum: money(paySum),
      });
    }

    const methods = [...new Set(input.payments.map((p) => p.method))];
    const paymentSummary = methods.length > 1 ? 'split' : methods[0];

    const receiptNo = await this.nextReceiptNo(tenantId, shift.location.code);
    const cashierId = actorId || shift.cashierId;

    const sale = await this.prisma.db.$transaction(async (tx) => {
      for (const line of snapshots) {
        await this.deductStockTx(tx, tenantId, shift.locationId, line.sku_id, line.qty, cashierId, 'pos_sale');
      }

      const created = await tx.posSale.create({
        data: {
          id: createId('psale'),
          tenantId,
          locationId: shift.locationId,
          registerId: shift.registerId,
          shiftId: shift.id,
          receiptNo,
          status: 'completed',
          currency: 'VND',
          subtotalAmount: subtotal,
          discountAmount: discount,
          totalAmount: total,
          paymentSummary,
          payments: input.payments as unknown as Prisma.InputJsonValue,
          customerName: input.customer_name || '',
          customerPhone: input.customer_phone || '',
          note: input.note || '',
          cashierId,
          linesSnapshot: snapshots as unknown as Prisma.InputJsonValue,
        },
      });

      // OMS shadow order for attribution / reporting
      const sf = await tx.storefront.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
      if (!sf) throw AppError.notFound('Storefront required for POS OMS shadow order');
      const orderId = createId('ord');
      await tx.order.create({
        data: {
          id: orderId,
          tenantId,
          storefrontId: sf.id,
          status: 'CONFIRMED',
          currency: 'VND',
          subtotalAmount: subtotal,
          discountAmount: discount,
          shippingAmount: 0,
          totalAmount: total,
          paymentMethod: paymentSummary === 'split' ? 'COD' : paymentSummary,
          paymentStatus: methods.includes('TRANSFER') && methods.length === 1 ? 'pending' : 'paid',
          shippingName: input.customer_name || 'POS Walk-in',
          shippingPhone: input.customer_phone || '0000000000',
          shippingAddress: shift.location.address || 'POS',
          shippingCity: shift.location.city || '',
          note: `POS ${receiptNo}`,
          attributionChannel: `pos/${shift.location.code}`,
          attributionProvider: 'pos',
          attributionThreadId: shift.id,
          lines: {
            create: snapshots.map((l) => ({
              id: createId('oline'),
              tenantId,
              skuId: l.sku_id,
              skuCode: l.sku_code,
              title: l.product_title,
              qty: l.qty,
              unitPrice: l.unit_price,
              lineTotal: l.line_total,
            })),
          },
        },
      });

      await tx.posSale.update({
        where: { id: created.id },
        data: { orderId },
      });

      const tender = { ...((shift.tenderSummary || {}) as Record<string, number>) };
      for (const p of input.payments) {
        tender[p.method] = Number(tender[p.method] || 0) + Number(p.amount);
      }

      await tx.posShift.update({
        where: { id: shift.id },
        data: {
          salesCount: { increment: 1 },
          salesTotal: { increment: total },
          tenderSummary: tender as Prisma.InputJsonValue,
        },
      });

      return { ...created, orderId };
    });

    let qr: { qr_image_url?: string; qr_payload?: string } | null = null;
    const transferPay = input.payments.find((p) => p.method === 'TRANSFER');
    if (transferPay && sale.orderId) {
      const intent = await this.payments.createIntentForOrder(
        tenantId,
        sale.orderId,
        Number(transferPay.amount),
        'VND',
        cashierId,
      );
      qr = {
        qr_image_url: intent.qr_image_url || undefined,
        qr_payload: intent.qr_payload || undefined,
      };
      await this.prisma.db.posSale.update({
        where: { id: sale.id },
        data: {
          qrImageUrl: qr.qr_image_url,
          qrPayload: qr.qr_payload,
        },
      });
    }

    await this.audit.write({
      tenantId,
      actorId: cashierId,
      action: 'pos.sale_create',
      entity: 'pos_sale',
      entityId: sale.id,
      payload: {
        receipt_no: receiptNo,
        total: money(total),
        payment_summary: paymentSummary,
        order_id: sale.orderId,
        location_id: shift.locationId,
      },
    });

    const full = await this.prisma.db.posSale.findFirstOrThrow({ where: { id: sale.id } });
    return {
      ...this.mapSale(full),
      receipt: {
        receipt_no: receiptNo,
        location: shift.location.name,
        register: shift.register.code,
        lines: snapshots,
        payments: input.payments,
        total: money(total),
        printed_at: new Date().toISOString(),
      },
    };
  }

  async getSale(tenantId: string, id: string) {
    const sale = await this.prisma.db.posSale.findFirst({ where: { id, tenantId } });
    if (!sale) throw AppError.notFound('Sale not found');
    return this.mapSale(sale);
  }

  async listSales(tenantId: string, query: { shift_id?: string; location_id?: string; limit?: number }) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const where: Prisma.PosSaleWhereInput = { tenantId };
    if (query.shift_id) where.shiftId = query.shift_id;
    if (query.location_id) where.locationId = query.location_id;
    const rows = await this.prisma.db.posSale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.mapSale(r));
  }

  async createReturn(
    tenantId: string,
    input: {
      sale_id: string;
      lines: Array<{ sku_id: string; qty: number }>;
      reason?: string;
      refund_tender?: Tender;
      shift_id?: string;
    },
    actorId?: string,
  ) {
    const sale = await this.prisma.db.posSale.findFirst({ where: { id: input.sale_id, tenantId } });
    if (!sale) throw AppError.notFound('Sale not found');
    if (sale.status === 'voided') throw AppError.conflict('Sale voided');

    const original = sale.linesSnapshot as Array<{
      sku_id: string;
      sku_code: string;
      product_title: string;
      qty: number;
      unit_price: string;
      line_total: string;
    }>;

    const retLines: typeof original = [];
    let total = new Prisma.Decimal(0);
    for (const line of input.lines) {
      const orig = original.find((o) => o.sku_id === line.sku_id);
      if (!orig) throw AppError.validation(`SKU ${line.sku_id} not on sale`);
      if (line.qty < 1 || line.qty > orig.qty) {
        throw AppError.validation('Invalid return qty', { sku_id: line.sku_id, max: orig.qty });
      }
      const unit = new Prisma.Decimal(orig.unit_price);
      const lineTotal = unit.mul(line.qty);
      total = total.add(lineTotal);
      retLines.push({
        sku_id: orig.sku_id,
        sku_code: orig.sku_code,
        product_title: orig.product_title,
        qty: line.qty,
        unit_price: orig.unit_price,
        line_total: money(lineTotal),
      });
    }

    const cashierId = actorId || sale.cashierId;
    const shiftId = input.shift_id || sale.shiftId;
    const refundTender = input.refund_tender || 'cash';

    const ret = await this.prisma.db.$transaction(async (tx) => {
      for (const line of retLines) {
        await this.restockTx(tx, tenantId, sale.locationId, line.sku_id, line.qty, cashierId, 'pos_return');
      }

      const created = await tx.posReturn.create({
        data: {
          id: createId('pret'),
          tenantId,
          saleId: sale.id,
          locationId: sale.locationId,
          shiftId,
          reason: input.reason || '',
          totalAmount: total,
          linesSnapshot: retLines as unknown as Prisma.InputJsonValue,
          refundTender,
          cashierId,
        },
      });

      const allReturned = original.every((o) => {
        const r = retLines.find((x) => x.sku_id === o.sku_id);
        return r && r.qty >= o.qty;
      });
      await tx.posSale.update({
        where: { id: sale.id },
        data: { status: allReturned ? 'returned' : 'partial_return' },
      });

      const shift = await tx.posShift.findFirst({ where: { id: shiftId, tenantId } });
      if (shift && shift.status === 'open') {
        const tender = { ...((shift.tenderSummary || {}) as Record<string, number>) };
        if (refundTender === 'cash') {
          tender.cash = Number(tender.cash || 0) - Number(total);
        }
        await tx.posShift.update({
          where: { id: shift.id },
          data: {
            returnsCount: { increment: 1 },
            returnsTotal: { increment: total },
            tenderSummary: tender as Prisma.InputJsonValue,
          },
        });
      }

      return created;
    });

    await this.audit.write({
      tenantId,
      actorId: cashierId,
      action: 'pos.return_create',
      entity: 'pos_return',
      entityId: ret.id,
      payload: { sale_id: sale.id, total: money(total), refund_tender: refundTender },
    });

    return {
      id: ret.id,
      sale_id: sale.id,
      total: money(total),
      refund_tender: refundTender,
      lines: retLines,
      reason: ret.reason,
      created_at: ret.createdAt.toISOString(),
    };
  }

  /** Pull global on_hand into location inventory if missing (bootstrap). */
  async syncLocationStockFromGlobal(tenantId: string, locationId: string) {
    const balances = await this.prisma.db.inventoryBalance.findMany({ where: { tenantId } });
    let upserted = 0;
    for (const b of balances) {
      const existing = await this.prisma.db.locationInventory.findFirst({
        where: { locationId, skuId: b.skuId },
      });
      if (!existing) {
        await this.prisma.db.locationInventory.create({
          data: {
            id: createId('linv'),
            tenantId,
            locationId,
            skuId: b.skuId,
            onHand: b.onHand,
          },
        });
        upserted += 1;
      }
    }
    return { synced: upserted, skus: balances.length };
  }

  private async nextReceiptNo(tenantId: string, locationCode: string) {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.db.posSale.count({
      where: { tenantId, createdAt: { gte: new Date(new Date().toDateString()) } },
    });
    return `${locationCode.toUpperCase()}-${day}-${String(count + 1).padStart(4, '0')}`;
  }

  private async deductStockTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    locationId: string,
    skuId: string,
    qty: number,
    actorId: string,
    reason: string,
  ) {
    let loc = await tx.locationInventory.findFirst({ where: { locationId, skuId } });
    if (!loc) {
      const bal = await tx.inventoryBalance.findFirst({ where: { tenantId, skuId } });
      loc = await tx.locationInventory.create({
        data: {
          id: createId('linv'),
          tenantId,
          locationId,
          skuId,
          onHand: bal?.onHand ?? 0,
        },
      });
    }
    if (loc.onHand < qty) {
      throw AppError.insufficientStock('Insufficient location stock', {
        sku_id: skuId,
        on_hand_location: loc.onHand,
        requested: qty,
      });
    }

    const bal = await tx.inventoryBalance.findFirst({ where: { tenantId, skuId } });
    if (!bal) throw AppError.notFound('Global inventory missing');
    const avail = Math.max(0, bal.onHand - bal.reserved);
    if (avail < qty || bal.onHand < qty) {
      throw AppError.insufficientStock('Insufficient global stock', {
        sku_id: skuId,
        available: avail,
        requested: qty,
      });
    }

    await tx.locationInventory.update({
      where: { id: loc.id },
      data: { onHand: loc.onHand - qty },
    });
    await tx.inventoryBalance.update({
      where: { id: bal.id },
      data: { onHand: bal.onHand - qty },
    });
    await tx.stockLedger.create({
      data: {
        id: createId('ldg'),
        tenantId,
        skuId,
        delta: -qty,
        reason,
        refType: 'pos',
        refId: locationId,
        actorId,
      },
    });
  }

  private async restockTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    locationId: string,
    skuId: string,
    qty: number,
    actorId: string,
    reason: string,
  ) {
    let loc = await tx.locationInventory.findFirst({ where: { locationId, skuId } });
    if (!loc) {
      loc = await tx.locationInventory.create({
        data: {
          id: createId('linv'),
          tenantId,
          locationId,
          skuId,
          onHand: 0,
        },
      });
    }
    const bal = await tx.inventoryBalance.findFirst({ where: { tenantId, skuId } });
    if (!bal) throw AppError.notFound('Global inventory missing');

    await tx.locationInventory.update({
      where: { id: loc.id },
      data: { onHand: loc.onHand + qty },
    });
    await tx.inventoryBalance.update({
      where: { id: bal.id },
      data: { onHand: bal.onHand + qty },
    });
    await tx.stockLedger.create({
      data: {
        id: createId('ldg'),
        tenantId,
        skuId,
        delta: qty,
        reason,
        refType: 'pos',
        refId: locationId,
        actorId,
      },
    });
  }

  private mapLocation(r: {
    id: string;
    code: string;
    name: string;
    address: string;
    city: string;
    status: string;
    createdAt: Date;
  }) {
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      address: r.address,
      city: r.city,
      status: r.status,
      created_at: r.createdAt.toISOString(),
    };
  }

  private mapRegister(r: {
    id: string;
    locationId: string;
    code: string;
    name: string;
    status: string;
  }) {
    return {
      id: r.id,
      location_id: r.locationId,
      code: r.code,
      name: r.name,
      status: r.status,
    };
  }

  private mapShift(r: {
    id: string;
    locationId: string;
    registerId: string;
    cashierId: string;
    status: string;
    openingCash: Prisma.Decimal;
    closingCash: Prisma.Decimal | null;
    expectedCash: Prisma.Decimal | null;
    cashVariance: Prisma.Decimal | null;
    salesCount: number;
    salesTotal: Prisma.Decimal;
    returnsCount: number;
    returnsTotal: Prisma.Decimal;
    tenderSummary: Prisma.JsonValue;
    openedAt: Date;
    closedAt: Date | null;
    note: string;
  }) {
    return {
      id: r.id,
      location_id: r.locationId,
      register_id: r.registerId,
      cashier_id: r.cashierId,
      status: r.status,
      opening_cash: money(r.openingCash),
      closing_cash: r.closingCash != null ? money(r.closingCash) : null,
      expected_cash: r.expectedCash != null ? money(r.expectedCash) : null,
      cash_variance: r.cashVariance != null ? money(r.cashVariance) : null,
      sales_count: r.salesCount,
      sales_total: money(r.salesTotal),
      returns_count: r.returnsCount,
      returns_total: money(r.returnsTotal),
      tender_summary: r.tenderSummary,
      opened_at: r.openedAt.toISOString(),
      closed_at: r.closedAt?.toISOString() ?? null,
      note: r.note,
    };
  }

  private mapSale(r: {
    id: string;
    locationId: string;
    registerId: string;
    shiftId: string;
    receiptNo: string;
    status: string;
    currency: string;
    subtotalAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    paymentSummary: string;
    payments: Prisma.JsonValue;
    customerName: string;
    customerPhone: string;
    note: string;
    cashierId: string;
    orderId: string | null;
    qrPayload: string | null;
    qrImageUrl: string | null;
    linesSnapshot: Prisma.JsonValue;
    createdAt: Date;
  }) {
    return {
      id: r.id,
      location_id: r.locationId,
      register_id: r.registerId,
      shift_id: r.shiftId,
      receipt_no: r.receiptNo,
      status: r.status,
      currency: r.currency,
      subtotal: money(r.subtotalAmount),
      discount: money(r.discountAmount),
      total: money(r.totalAmount),
      payment_summary: r.paymentSummary,
      payments: r.payments,
      customer_name: r.customerName,
      customer_phone: r.customerPhone,
      note: r.note,
      cashier_id: r.cashierId,
      order_id: r.orderId,
      qr_payload: r.qrPayload,
      qr_image_url: r.qrImageUrl,
      lines: r.linesSnapshot,
      created_at: r.createdAt.toISOString(),
    };
  }
}
