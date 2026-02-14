import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}
  // TODO: Implement CRUD operations — see activities.module.ts for pattern
}
