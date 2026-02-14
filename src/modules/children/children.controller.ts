import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChildrenService } from './children.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
@ApiTags('children')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('children')
export class ChildrenController {
  constructor(private childrenService: ChildrenService) {}
  // TODO: Implement endpoints — see activities.controller.ts for pattern
}
