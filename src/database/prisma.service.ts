// ============================================================================
// prisma.service.ts — Database connection
// ============================================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Soft delete helper — use in services
  excludeDeleted() {
    return { deletedAt: null };
  }

  // Multi-tenant scope helper
  forOrg(organizationId: string) {
    return { organizationId, ...this.excludeDeleted() };
  }
}
