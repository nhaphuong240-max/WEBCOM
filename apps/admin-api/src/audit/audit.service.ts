import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: {
    tenantId: string;
    actorId?: string;
    action: string;
    entity: string;
    entityId: string;
    payload?: Prisma.InputJsonValue;
  }) {
    if (!this.prisma.isReady()) return;
    await this.prisma.db.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        payload: input.payload ?? {},
      },
    });
  }
}
