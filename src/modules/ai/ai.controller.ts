import { Controller, Post, Body, Param, UseGuards, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class GenerateSummaryDto {
  @IsString() childId: string;
  @IsOptional() @IsDateString() date?: string;
}

class GenerateClassroomSummariesDto {
  @IsString() classroomId: string;
  @IsOptional() @IsDateString() date?: string;
}

class AnalyzeSentimentDto {
  @IsString() content: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('summary/generate')
  @ApiOperation({ summary: 'Generate AI daily summary for a child' })
  async generateSummary(@Body() dto: GenerateSummaryDto, @CurrentUser() user: any) {
    const date = dto.date ? new Date(dto.date) : new Date();
    return this.aiService.saveDailySummary(dto.childId, user.orgId, date);
  }

  @Post('summary/generate-classroom')
  @ApiOperation({ summary: 'Generate AI summaries for all children in a classroom' })
  async generateClassroomSummaries(@Body() dto: GenerateClassroomSummariesDto, @CurrentUser() user: any) {
    const date = dto.date ? new Date(dto.date) : new Date();
    return this.aiService.generateClassroomSummaries(dto.classroomId, user.orgId, date);
  }

  @Post('summary/:summaryId/send')
  @ApiOperation({ summary: 'Send a daily summary to parents' })
  async sendToParents(@Param('summaryId') summaryId: string) {
    return this.aiService.sendSummaryToParents(summaryId);
  }

  @Post('analyze-sentiment')
  @ApiOperation({ summary: 'Analyze sentiment of a parent message' })
  async analyzeSentiment(@Body() dto: AnalyzeSentimentDto) {
    return this.aiService.analyzeMessageSentiment(dto.content);
  }
}
