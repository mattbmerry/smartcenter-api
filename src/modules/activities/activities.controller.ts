import { Controller, Post, Get, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, IsBoolean, IsDateString } from 'class-validator';
import { ActivityType, MealType } from '@prisma/client';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class CreateActivityDto {
  @IsString() childId: string;
  @IsString() centerId: string;
  @IsOptional() @IsString() classroomId?: string;
  @IsEnum(ActivityType) activityType: ActivityType;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsEnum(MealType) mealType?: MealType;
  @IsOptional() @IsArray() mealItems?: string[];
  @IsOptional() @IsString() mealAmount?: string;
  @IsOptional() @IsDateString() napStartTime?: string;
  @IsOptional() @IsDateString() napEndTime?: string;
  @IsOptional() @IsString() napQuality?: string;
  @IsOptional() @IsString() diaperType?: string;
  @IsOptional() @IsString() mood?: string;
  @IsOptional() @IsString() milestoneCategory?: string;
  @IsOptional() @IsString() milestoneName?: string;
  @IsOptional() @IsString() medicationName?: string;
  @IsOptional() @IsString() medicationDose?: string;
  @IsOptional() @IsBoolean() visibleToParents?: boolean;
}

class BatchActivityDto {
  @IsArray() childIds: string[];
  @IsString() centerId: string;
  @IsString() classroomId: string;
  @IsEnum(ActivityType) activityType: ActivityType;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(MealType) mealType?: MealType;
  @IsOptional() @IsArray() mealItems?: string[];
}

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private activitiesService: ActivitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Log a single activity for a child' })
  create(@Body() dto: CreateActivityDto, @CurrentUser() user: any) {
    return this.activitiesService.create({
      ...dto,
      organizationId: user.orgId,
      recordedById: user.id,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      napStartTime: dto.napStartTime ? new Date(dto.napStartTime) : undefined,
      napEndTime: dto.napEndTime ? new Date(dto.napEndTime) : undefined,
    });
  }

  @Post('batch')
  @ApiOperation({ summary: 'Log activity for multiple children at once' })
  createBatch(@Body() dto: BatchActivityDto, @CurrentUser() user: any) {
    return this.activitiesService.createBatch({
      ...dto,
      organizationId: user.orgId,
      recordedById: user.id,
    });
  }

  @Get('child/:childId')
  @ApiOperation({ summary: 'Get activity timeline for a child' })
  @ApiQuery({ name: 'date', required: false })
  getChildTimeline(
    @Param('childId') childId: string,
    @Query('date') date: string,
    @CurrentUser() user: any,
  ) {
    return this.activitiesService.getChildTimeline(
      childId,
      user.orgId,
      date ? new Date(date) : undefined,
    );
  }

  @Get('classroom/:classroomId')
  @ApiOperation({ summary: 'Get activity feed for a classroom' })
  @ApiQuery({ name: 'date', required: false })
  getClassroomFeed(
    @Param('classroomId') classroomId: string,
    @Query('date') date: string,
    @CurrentUser() user: any,
  ) {
    return this.activitiesService.getClassroomFeed(
      classroomId,
      user.orgId,
      date ? new Date(date) : undefined,
    );
  }
}
