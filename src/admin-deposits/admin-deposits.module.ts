import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { SafeModule } from '../safe/safe.module';
import { AdminDepositsController } from './admin-deposits.controller';
import { AdminMintsController } from './admin-mints.controller';
import { AdminDepositQueryService } from './admin-deposit-query.service';
import { AdminDepositReviewService } from './admin-deposit-review.service';
import { AdminMintProposalService } from './admin-mint-proposal.service';

@Module({
  imports: [PrismaModule, SafeModule],
  controllers: [AdminDepositsController, AdminMintsController],
  providers: [AdminDepositQueryService, AdminDepositReviewService, AdminMintProposalService],
})
export class AdminDepositsModule {}
