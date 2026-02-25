import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ListenerService } from './listener.service';
import { EventProcessorService } from './processors/event-processor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ListEventLogsQueryDto } from './dto/list-event-logs.dto';

@Controller('listener')
export class ListenerController {
  constructor(
    private readonly listenerService: ListenerService,
    private processorService: EventProcessorService,
  ) {}

  @Get('status')
  getStatus() {
    return {
      ...this.listenerService.getStatus(),
      contractPaused: this.processorService.getIsPaused(),
    };
  }

  @Get('event-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  listEventLogs(@Query() query: ListEventLogsQueryDto) {
    return this.listenerService.findEventLogs({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      eventType: query.eventType,
      userAddress: query.userAddress,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }
}
