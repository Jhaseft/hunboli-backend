import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminDepositQueryService } from './admin-deposit-query.service';
import { ListAdminMintsQueryDto } from './dto/list-admin-mints.dto';

@Controller('admin/mints')
@UseGuards(AuthGuard('jwt'))
export class AdminMintsController {
  constructor(private readonly queryService: AdminDepositQueryService) {}

  @Get()
  list(@Req() req: any, @Query() q: ListAdminMintsQueryDto) {
    return this.queryService.listMints(req.user, q);
  }

  @Get('count-pending')
  countPending(@Req() req: any) {
    return this.queryService.getPendingMintsCount(req.user);
  }
}
