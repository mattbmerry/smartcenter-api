// ============================================================================
// auth.service.ts — Authentication logic
// ============================================================================

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';

export interface JwtPayload {
  sub: string;        // user ID
  email: string;
  orgId: string;      // current organization
  centerId?: string;   // current center (if scoped)
  role: string;        // active role
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── Register a new user ──
  async register(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
    });

    return { user: this.sanitizeUser(user) };
  }

  // ── Login ──
  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: true, center: true },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get primary membership for token
    const primaryMembership = user.memberships[0];
    if (!primaryMembership) {
      throw new UnauthorizedException('No active organization membership');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: primaryMembership.organizationId,
      centerId: primaryMembership.centerId || undefined,
      role: primaryMembership.role,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: this.sanitizeUser(user),
      memberships: user.memberships.map(m => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        centerId: m.centerId,
        centerName: m.center?.name,
        role: m.role,
      })),
    };
  }

  // ── Switch organization/center context ──
  async switchContext(userId: string, organizationId: string, centerId?: string) {
    const membership = await this.prisma.userMembership.findFirst({
      where: {
        userId,
        organizationId,
        centerId: centerId || null,
        isActive: true,
      },
    });

    if (!membership) throw new UnauthorizedException('Not a member of this organization');

    const payload: JwtPayload = {
      sub: userId,
      email: '', // Will be filled from token refresh
      orgId: organizationId,
      centerId,
      role: membership.role,
    };

    return { accessToken: this.jwt.sign(payload) };
  }

  // ── Validate JWT payload (used by JwtStrategy) ──
  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException();
    return { ...user, orgId: payload.orgId, centerId: payload.centerId, activeRole: payload.role };
  }

  // ── Invite user to organization ──
  async inviteUser(dto: {
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    centerId?: string;
    role: string;
  }) {
    // Find or create user
    let user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });
    }

    // Create membership
    const membership = await this.prisma.userMembership.create({
      data: {
        userId: user.id,
        organizationId: dto.organizationId,
        centerId: dto.centerId,
        role: dto.role as any,
      },
    });

    // TODO: Send invitation email via nodemailer/SendGrid

    return { user: this.sanitizeUser(user), membership };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
