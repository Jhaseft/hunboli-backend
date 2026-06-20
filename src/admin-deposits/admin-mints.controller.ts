import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminMintQueryService } from './admin-mint-query.service';
import { ListAdminMintsQueryDto } from './dto/list-admin-mints.dto';

@Controller('admin/mints')
@UseGuards(AuthGuard('jwt'))
export class AdminMintsController {
  constructor(private readonly mintQueryService: AdminMintQueryService) {}

  @Get()
  list(@Req() req: any, @Query() q: ListAdminMintsQueryDto) {
    return this.mintQueryService.listMints(req.user, q);
  }

  @Get('count-pending')
  countPending(@Req() req: any) {
    return this.mintQueryService.getPendingMintsCount(req.user);
  }
}
