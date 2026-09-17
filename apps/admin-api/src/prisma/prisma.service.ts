import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client = new PrismaClient();
  private ready = false;

  get db() {
    return this.client;
  }

  async onModuleInit() {
    try {
      await this.client.$connect();
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  async onModuleDestroy() {
    if (this.ready) await this.client.$disconnect();
  }

  isReady() {
    return this.ready;
  }
}
