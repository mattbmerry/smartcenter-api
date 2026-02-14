import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CentersService } from './centers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
@ApiTags('centers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('centers')
export class CentersController {
  constructor(private centersService: CentersService) {}
  // TODO: Implement endpoints — see activities.controller.ts for pattern
}
