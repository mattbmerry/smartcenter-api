// ============================================================================
// app.module.ts — Root module
// ============================================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChildrenModule } from './modules/children/children.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { BillingModule } from './modules/billing/billing.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AiModule } from './modules/ai/ai.module';
import { StaffModule } from './modules/staff/staff.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { MediaModule } from './modules/media/media.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CentersModule } from './modules/centers/centers.module';
import { ClassroomsModule } from './modules/classrooms/classrooms.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting: 100 requests per 60 seconds per IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Scheduled tasks (daily summary generation, invoice creation, etc.)
    ScheduleModule.forRoot(),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    OrganizationsModule,
    CentersModule,
    ClassroomsModule,
    ChildrenModule,
    AttendanceModule,
    ActivitiesModule,
    BillingModule,
    MessagingModule,
    AiModule,
    StaffModule,
    WaitlistModule,
    MediaModule,
  ],
})
export class AppModule {}
