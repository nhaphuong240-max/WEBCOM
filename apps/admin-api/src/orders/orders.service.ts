import { Injectable } from '@nestjs/common';
import { AppError } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

const TRANSITIONS: Record<string, string[]> = {
  CONFIRMED: ['FULFILLING', 'CANCELLED'],
  FULFILLING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
  ) {}

  async get(tenantId: string, orderId: string) {
    const order = await this.prisma.db.order.findFirst({
      where: { id: orderId, tenantId },
      include: { lines: true },
    });
    if (!order) throw AppError.notFound('Order not found');
    return this.map(order);
  }

  async list(tenantId: string) {
    const orders = await this.prisma.db.order.findMany({
      where: { tenantId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return orders.map((o) => this.map(o));
  }

  async transition(tenantId: string, actorId: string, orderId: string, status: string) {
    const order = await this.prisma.db.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order) throw AppError.notFound('Order not found');
    const allowed = TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw AppError.conflict(`Cannot transition ${order.status} → ${status}`);
    }

    if (status === 'CANCELLED') {
      await this.inventory.releaseForOrder(tenantId, orderId, actorId);
    }

    const updated = await this.prisma.db.order.update({
      where: { id: orderId },
      data: { status },
      include: { lines: true },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'order.transition',
      entity: 'order',
      entityId: orderId,
      payload: { from: order.status, to: status },
    });

    return this.map(updated);
  }

  private map(order: {
    id: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    currency: string;
    subtotalAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    shippingAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    shippingName: string;
    shippingPhone: string;
    shippingAddress: string;
    shippingCity: string;
    shippingCarrier: string | null;
    shippingService: string | null;
    voucherCode: string | null;
    attributionChannel?: string | null;
    attributionThreadId?: string | null;
    attributionProvider?: string | null;
    socialDraftId?: string | null;
    createdAt: Date;
    lines: Array<{
      skuCode: string;
      title: string;
      qty: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }>;
  }) {
    return {
      id: order.id,
      status: order.status,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      currency: order.currency,
      subtotal: money(order.subtotalAmount),
      discount: money(order.discountAmount),
      shipping_amount: money(order.shippingAmount),
      total: money(order.totalAmount),
      voucher_code: order.voucherCode,
      attribution_channel: order.attributionChannel ?? null,
      attribution_thread_id: order.attributionThreadId ?? null,
      attribution_provider: order.attributionProvider ?? null,
      social_draft_id: order.socialDraftId ?? null,
      shipping: {
        name: order.shippingName,
        phone: order.shippingPhone,
        address: order.shippingAddress,
        city: order.shippingCity,
        carrier: order.shippingCarrier,
        service: order.shippingService,
      },
      lines: order.lines.map((l) => ({
        sku_code: l.skuCode,
        title: l.title,
        qty: l.qty,
        unit_price: money(l.unitPrice),
        line_total: money(l.lineTotal),
      })),
      created_at: order.createdAt.toISOString(),
    };
  }
}
