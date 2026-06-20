import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminDepositQueryService } from './admin-deposit-query.service';
import { AdminDepositReviewService } from './admin-deposit-review.service';
import { AdminMintProposalService } from './admin-mint-proposal.service';
import { ListAdminDepositsQueryDto } from './dto/list-admin-deposits.dto';
import { AdminDecisionDto } from './dto/decision.dto';
import { RequestCorrectionDto } from './dto/request-correction.dto';

@Controller('admin/deposits')
@UseGuards(AuthGuard('jwt'))
export class AdminDepositsController {
  constructor(
    private readonly queryService: AdminDepositQueryService,
    private readonly reviewService: AdminDepositReviewService,
    private readonly mintService: AdminMintProposalService,
  ) {}

  @Get()
  list(@Req() req: any, @Query() q: ListAdminDepositsQueryDto) {
    return this.queryService.list(req.user, q);
  }

  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.queryService.getOne(req.user, id);
  }

  @Patch(':id/decision')
  decide(@Req() req: any, @Param('id') id: string, @Body() dto: AdminDecisionDto) {
    return this.reviewService.decide(req.user, id, dto);
  }

  @Patch(':id/request-correction')
  requestCorrection(@Req() req: any, @Param('id') id: string, @Body() dto: RequestCorrectionDto) {
    return this.reviewService.requestCorrection(req.user, id, dto);
  }

  @Post(':id/propose-mint')
  proposeMint(@Req() req: any, @Param('id') id: string) {
    return this.mintService.proposeMint(req.user, id);
  }
}
