// ============================================================================
// AI MODULE — Claude integration for daily summaries, insights, and more
// This is the core differentiator. Real AI, not a simulation.
// ============================================================================

// --- ai.module.ts ---
import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [ActivitiesModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
