import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../catalog/catalog.service';

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async create(tenantId: string, storefrontId: string, customerId?: string) {
    const sf = await this.prisma.db.storefront.findFirst({
      where: { id: storefrontId, tenantId },
    });
    if (!sf) throw AppError.notFound('Storefront not found');

    const cart = await this.prisma.db.cart.create({
      data: {
        id: createId('cart'),
        tenantId,
        storefrontId,
        customerId,
      },
    });
    return this.getPriced(tenantId, cart.id);
  }

  async addItem(tenantId: string, cartId: string, skuId: string, qty: number) {
    if (qty < 1) throw AppError.validation('qty must be >= 1');
    const cart = await this.requireOpenCart(tenantId, cartId);
    const sku = await this.prisma.db.sku.findFirst({
      where: { id: skuId, tenantId, status: 'active' },
      include: { inventory: true },
    });
    if (!sku) throw AppError.notFound('SKU not found');

    const onHand = sku.inventory?.onHand ?? 0;
    const reserved = sku.inventory?.reserved ?? 0;
    const available = Math.max(0, onHand - reserved);
    const existing = await this.prisma.db.cartLine.findUnique({
      where: { cartId_skuId: { cartId: cart.id, skuId } },
    });
    const nextQty = (existing?.qty ?? 0) + qty;
    if (nextQty > available) {
      throw AppError.insufficientStock('Not enough stock for cart', {
        available,
        requested: nextQty,
      });
    }

    if (existing) {
      await this.prisma.db.cartLine.update({
        where: { id: existing.id },
        data: { qty: nextQty },
      });
    } else {
      await this.prisma.db.cartLine.create({
        data: {
          id: createId('cline'),
          tenantId,
          cartId: cart.id,
          skuId,
          qty,
        },
      });
    }
    return this.getPriced(tenantId, cartId);
  }

  async updateItem(tenantId: string, cartId: string, lineId: string, qty: number) {
    await this.requireOpenCart(tenantId, cartId);
    const line = await this.prisma.db.cartLine.findFirst({
      where: { id: lineId, cartId, tenantId },
      include: { sku: { include: { inventory: true } } },
    });
    if (!line) throw AppError.notFound('Cart line not found');
    if (qty < 1) {
      await this.prisma.db.cartLine.delete({ where: { id: line.id } });
      return this.getPriced(tenantId, cartId);
    }
    const onHand = line.sku.inventory?.onHand ?? 0;
    const reserved = line.sku.inventory?.reserved ?? 0;
    const available = Math.max(0, onHand - reserved);
    if (qty > available) {
      throw AppError.insufficientStock('Not enough stock', { available, requested: qty });
    }
    await this.prisma.db.cartLine.update({ where: { id: line.id }, data: { qty } });
    return this.getPriced(tenantId, cartId);
  }

  async removeItem(tenantId: string, cartId: string, lineId: string) {
    await this.requireOpenCart(tenantId, cartId);
    await this.prisma.db.cartLine.deleteMany({ where: { id: lineId, cartId, tenantId } });
    return this.getPriced(tenantId, cartId);
  }

  async getPriced(tenantId: string, cartId: string) {
    const cart = await this.prisma.db.cart.findFirst({
      where: { id: cartId, tenantId },
      include: {
        lines: {
          include: {
            sku: {
              include: {
                inventory: true,
                variant: { include: { product: true } },
              },
            },
          },
        },
      },
    });
    if (!cart) throw AppError.notFound('Cart not found');

    let subtotal = new Prisma.Decimal(0);
    const lines = [];
    for (const line of cart.lines) {
      const price = await this.pricing.resolveUnitPrice(tenantId, line.skuId);
      const lineTotal = price.unitPrice.mul(line.qty);
      subtotal = subtotal.add(lineTotal);
      const onHand = line.sku.inventory?.onHand ?? 0;
      const reserved = line.sku.inventory?.reserved ?? 0;
      lines.push({
        id: line.id,
        sku_id: line.skuId,
        sku_code: line.sku.code,
        title: line.sku.variant.product.title,
        qty: line.qty,
        unit_price: money(price.unitPrice),
        line_total: money(lineTotal),
        available: Math.max(0, onHand - reserved),
      });
    }

    return {
      id: cart.id,
      status: cart.status,
      storefront_id: cart.storefrontId,
      currency: cart.currency,
      lines,
      subtotal: money(subtotal),
      total: money(subtotal),
      note: 'Totals are server-calculated; client amounts are ignored at checkout.',
    };
  }

  private async requireOpenCart(tenantId: string, cartId: string) {
    const cart = await this.prisma.db.cart.findFirst({ where: { id: cartId, tenantId } });
    if (!cart) throw AppError.notFound('Cart not found');
    if (cart.status !== 'open') throw AppError.conflict('Cart is not open');
    return cart;
  }
}
