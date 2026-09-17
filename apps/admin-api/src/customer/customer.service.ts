import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import * as bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async register(
    tenantId: string,
    input: {
      email?: string;
      phone?: string;
      password: string;
      name?: string;
      consentMarketing?: boolean;
    },
  ) {
    if (!input.email && !input.phone) {
      throw AppError.validation('email or phone required');
    }
    if (!input.consentMarketing) {
      throw AppError.validation('consent_marketing required (BR-020)');
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    try {
      const customer = await this.prisma.db.customer.create({
        data: {
          id: createId('cus'),
          tenantId,
          email: input.email,
          phone: input.phone,
          passwordHash,
          name: input.name ?? '',
          consentMarketing: true,
        },
      });
      await this.audit.write({
        tenantId,
        actorId: customer.id,
        action: 'customer.register',
        entity: 'customer',
        entityId: customer.id,
      });
      return { id: customer.id, email: customer.email, phone: customer.phone, name: customer.name };
    } catch {
      throw AppError.conflict('Customer already exists');
    }
  }

  async login(tenantId: string, input: { email?: string; phone?: string; password: string }) {
    const customer = await this.prisma.db.customer.findFirst({
      where: {
        tenantId,
        OR: [
          ...(input.email ? [{ email: input.email }] : []),
          ...(input.phone ? [{ phone: input.phone }] : []),
        ],
      },
    });
    if (!customer?.passwordHash) throw AppError.unauthorized('Invalid credentials');
    const ok = await bcrypt.compare(input.password, customer.passwordHash);
    if (!ok) throw AppError.unauthorized('Invalid credentials');
    return this.tokenFor(tenantId, customer);
  }

  /** W1 stub OTP: accept 000000 (or OTP_DEV_CODE). */
  async loginOtp(tenantId: string, phone: string, otp: string) {
    const expected = process.env.OTP_DEV_CODE ?? '000000';
    if (otp !== expected) throw AppError.unauthorized('Invalid OTP');

    let customer = await this.prisma.db.customer.findFirst({ where: { tenantId, phone } });
    if (!customer) {
      customer = await this.prisma.db.customer.create({
        data: {
          id: createId('cus'),
          tenantId,
          phone,
          consentMarketing: true,
          name: '',
        },
      });
    }
    return this.tokenFor(tenantId, customer);
  }

  private async tokenFor(
    tenantId: string,
    customer: { id: string; email: string | null; phone: string | null; name: string },
  ) {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? 'ptt-w0-dev-secret-change-me',
    );
    const token = await new SignJWT({ tenant_id: tenantId, roles: ['customer'] })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(customer.id)
      .setIssuer(process.env.JWT_ISSUER ?? 'ptt-local')
      .setExpirationTime('7d')
      .sign(secret);
    return {
      access_token: token,
      customer: {
        id: customer.id,
        email: customer.email,
        phone: customer.phone,
        name: customer.name,
      },
    };
  }
}
