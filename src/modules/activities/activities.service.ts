import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActivityType, MealType } from '@prisma/client';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: {
    organizationId: string;
    centerId: string;
    classroomId?: string;
    childId: string;
    recordedById: string;
    activityType: ActivityType;
    title?: string;
    description?: string;
    occurredAt?: Date;
    mealType?: MealType;
    mealItems?: string[];
    mealAmount?: string;
    napStartTime?: Date;
    napEndTime?: Date;
    napQuality?: string;
    diaperType?: string;
    mood?: string;
    milestoneCategory?: string;
    milestoneName?: string;
    medicationName?: string;
    medicationDose?: string;
    visibleToParents?: boolean;
  }) {
    const child = await this.prisma.child.findFirst({
      where: { id: dto.childId, organizationId: dto.organizationId, deletedAt: null },
    });
    if (!child) throw new NotFoundException('Child not found');

    const activity = await this.prisma.activity.create({
      data: {
        organizationId: dto.organizationId,
        centerId: dto.centerId,
        classroomId: dto.classroomId || child.classroomId,
        childId: dto.childId,
        recordedById: dto.recordedById,
        activityType: dto.activityType,
        title: dto.title,
        description: dto.description,
        occurredAt: dto.occurredAt || new Date(),
        mealType: dto.mealType,
        mealItems: dto.mealItems,
        mealAmount: dto.mealAmount,
        napStartTime: dto.napStartTime,
        napEndTime: dto.napEndTime,
        napQuality: dto.napQuality,
        diaperType: dto.diaperType,
        mood: dto.mood,
        milestoneCategory: dto.milestoneCategory,
        milestoneName: dto.milestoneName,
        medicationName: dto.medicationName,
        medicationDose: dto.medicationDose,
        visibleToParents: dto.visibleToParents ?? true,
      },
      include: {
        child: { select: { firstName: true, lastName: true, avatarUrl: true } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return activity;
  }

  async createBatch(dto: {
    organizationId: string;
    centerId: string;
    classroomId: string;
    recordedById: string;
    childIds: string[];
    activityType: ActivityType;
    title?: string;
    description?: string;
    mealType?: MealType;
    mealItems?: string[];
  }) {
    const activities = await this.prisma.activity.createMany({
      data: dto.childIds.map(childId => ({
        organizationId: dto.organizationId,
        centerId: dto.centerId,
        classroomId: dto.classroomId,
        childId,
        recordedById: dto.recordedById,
        activityType: dto.activityType,
        title: dto.title,
        description: dto.description,
        mealType: dto.mealType,
        mealItems: dto.mealItems,
      })),
    });

    return { count: activities.count, message: `Logged for ${activities.count} children` };
  }

  async getChildTimeline(childId: string, organizationId: string, date?: Date) {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.activity.findMany({
      where: {
        childId,
        organizationId,
        visibleToParents: true,
        occurredAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        recordedBy: { select: { firstName: true, lastName: true } },
        activityMedia: { include: { media: true } },
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async getClassroomFeed(classroomId: string, organizationId: string, date?: Date) {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.activity.findMany({
      where: {
        classroomId,
        organizationId,
        occurredAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        child: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async getChildDayActivities(childId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.activity.findMany({
      where: {
        childId,
        occurredAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        activityMedia: { include: { media: true } },
      },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
