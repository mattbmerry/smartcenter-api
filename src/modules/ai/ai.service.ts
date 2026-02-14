import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { ActivitiesService } from '../activities/activities.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private activitiesService: ActivitiesService,
    private config: ConfigService,
  ) {}

  async generateDailySummary(childId: string, date: Date): Promise<{
    summaryText: string;
    highlights: string[];
    stats: { totalActivities: number; mealsEaten: number; napMinutes: number; photosCount: number };
  }> {
    const activities = await this.activitiesService.getChildDayActivities(childId, date);

    if (activities.length === 0) {
      return {
        summaryText: 'No activities were logged today.',
        highlights: [],
        stats: { totalActivities: 0, mealsEaten: 0, napMinutes: 0, photosCount: 0 },
      };
    }

    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { firstName: true, lastName: true, dateOfBirth: true, allergies: true, preferredName: true },
    });

    if (!child) {
      return {
        summaryText: 'Child not found.',
        highlights: [],
        stats: { totalActivities: 0, mealsEaten: 0, napMinutes: 0, photosCount: 0 },
      };
    }

    const activitiesText = activities.map(a => {
      let line = `[${a.occurredAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}] ${a.activityType}`;
      if (a.title) line += `: ${a.title}`;
      if (a.description) line += ` — ${a.description}`;
      if (a.mealType) line += ` (${a.mealType}, ate: ${a.mealAmount || 'unknown'})`;
      if (a.napStartTime && a.napEndTime) {
        const mins = Math.round((a.napEndTime.getTime() - a.napStartTime.getTime()) / 60000);
        line += ` (${mins} minutes, ${a.napQuality || 'normal'})`;
      }
      if (a.diaperType) line += ` (${a.diaperType})`;
      if (a.mood) line += ` — mood: ${a.mood}`;
      if (a.milestoneName) line += ` MILESTONE: ${a.milestoneName}`;
      return line;
    }).join('\n');

    const childName = child.preferredName || child.firstName;

    // If Anthropic API key is configured, use Claude. Otherwise return a template.
    const apiKey = this.config.get('ANTHROPIC_API_KEY');
    let summaryText: string;

    if (apiKey) {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `You are a warm, professional childcare daily report writer. Write a daily summary for a parent about their child's day.\n\nChild's name: ${childName} ${child.lastName}\nDate: ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}\n\nToday's activities:\n${activitiesText}\n\nWrite 3-5 warm paragraphs. Highlight milestones. Mention meals and nap duration. Keep it under 200 words.`
          }],
        });
        summaryText = response.content[0].type === 'text' ? response.content[0].text : '';
      } catch (error) {
        this.logger.warn(`AI generation failed, using template: ${error.message}`);
        summaryText = `${childName} had a great day with ${activities.length} activities logged. Check the timeline for full details.`;
      }
    } else {
      summaryText = `${childName} had a great day with ${activities.length} activities logged. Check the timeline for full details.`;
    }

    const highlights: string[] = [];
    activities.forEach(a => {
      if (a.activityType === 'milestone' && a.milestoneName) highlights.push(`Milestone: ${a.milestoneName}`);
    });

    const stats = {
      totalActivities: activities.length,
      mealsEaten: activities.filter(a => a.activityType === 'meal' || a.activityType === 'snack').length,
      napMinutes: activities
        .filter(a => a.napStartTime && a.napEndTime)
        .reduce((sum, a) => sum + Math.round((a.napEndTime!.getTime() - a.napStartTime!.getTime()) / 60000), 0),
      photosCount: activities.filter(a => a.activityMedia && a.activityMedia.length > 0).length,
    };

    return { summaryText, highlights, stats };
  }

  async saveDailySummary(childId: string, organizationId: string, date: Date) {
    const result = await this.generateDailySummary(childId, date);

    const summary = await this.prisma.dailySummary.upsert({
      where: { childId_date: { childId, date } },
      create: {
        organizationId,
        childId,
        date,
        summaryText: result.summaryText,
        highlights: result.highlights,
        totalActivities: result.stats.totalActivities,
        mealsEaten: result.stats.mealsEaten,
        napDurationMins: result.stats.napMinutes,
        photosCount: result.stats.photosCount,
        aiGeneratedAt: new Date(),
        aiModel: 'claude-sonnet-4-20250514',
      },
      update: {
        summaryText: result.summaryText,
        highlights: result.highlights,
        totalActivities: result.stats.totalActivities,
        mealsEaten: result.stats.mealsEaten,
        napDurationMins: result.stats.napMinutes,
        photosCount: result.stats.photosCount,
        aiGeneratedAt: new Date(),
        teacherReviewed: false,
      },
    });

    return summary;
  }

  async generateClassroomSummaries(classroomId: string, organizationId: string, date?: Date) {
    const targetDate = date || new Date();

    const children = await this.prisma.child.findMany({
      where: { classroomId, organizationId, enrollmentStatus: 'enrolled', deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });

    const results: Array<{ childId: string; name: string; status: string; error?: string }> = [];
    for (const child of children) {
      try {
        await this.saveDailySummary(child.id, organizationId, targetDate);
        results.push({ childId: child.id, name: `${child.firstName} ${child.lastName}`, status: 'success' });
      } catch (error: any) {
        this.logger.error(`Failed to generate summary for ${child.firstName}: ${error.message}`);
        results.push({ childId: child.id, name: `${child.firstName} ${child.lastName}`, status: 'error', error: error.message });
      }
    }

    return { generated: results.filter(r => r.status === 'success').length, total: children.length, results };
  }

  async sendSummaryToParents(summaryId: string) {
    const summary = await this.prisma.dailySummary.findUnique({
      where: { id: summaryId },
      include: {
        child: {
          include: {
            guardians: {
              include: { user: { select: { id: true, email: true, phone: true, notificationPreferences: true } } },
            },
          },
        },
      },
    });

    if (!summary) throw new Error('Summary not found');

    for (const guardian of summary.child.guardians) {
      await this.prisma.notification.create({
        data: {
          userId: guardian.user.id,
          organizationId: summary.organizationId,
          channel: 'push',
          title: `${summary.child.firstName}'s Daily Summary`,
          body: summary.summaryText.substring(0, 150) + '...',
          actionType: 'open_summary',
          referenceId: summary.id,
          referenceType: 'daily_summary',
          sentAt: new Date(),
        },
      });
    }

    await this.prisma.dailySummary.update({
      where: { id: summaryId },
      data: { sentToParents: true, sentAt: new Date() },
    });

    return { sent: true, recipientCount: summary.child.guardians.length };
  }

  async analyzeMessageSentiment(messageContent: string): Promise<{
    sentiment: string;
    requiresResponse: boolean;
    confidence: number;
  }> {
    const apiKey = this.config.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return { sentiment: 'neutral', requiresResponse: false, confidence: 0.5 };
    }

    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Analyze this parent message from a childcare app. Respond with ONLY a JSON object.\n\nMessage: "${messageContent}"\n\nJSON format:\n{"sentiment": "positive|neutral|negative|concerned", "requiresResponse": true|false, "confidence": 0.0-1.0}`
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const cleaned = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { sentiment: 'neutral', requiresResponse: false, confidence: 0.5 };
    }
  }

  @Cron('0 17 * * 1-5')
  async scheduledDailySummaries() {
    this.logger.log('Starting scheduled daily summary generation...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const classrooms = await this.prisma.classroom.findMany({
      where: { deletedAt: null },
      select: { id: true, organizationId: true, name: true },
    });

    for (const classroom of classrooms) {
      try {
        await this.generateClassroomSummaries(classroom.id, classroom.organizationId, today);
        this.logger.log(`Generated summaries for ${classroom.name}`);
      } catch (error: any) {
        this.logger.error(`Failed for ${classroom.name}: ${error.message}`);
      }
    }
  }
}
