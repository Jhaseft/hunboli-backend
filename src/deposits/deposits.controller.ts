import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DepositsService } from './deposits.service';
import { CreateDepositDto } from './dto/create-deposit.dto';

interface AuthenticatedRequest {
  user: { userId: string };
}

@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDepositDto) {
    const userId = req.user.userId;
    return this.depositsService.createDeposit(userId, dto);
  }
}
