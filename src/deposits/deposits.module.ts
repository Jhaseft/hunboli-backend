import { Module } from '@nestjs/common';
import { DepositsController } from './deposits.controller';
import { DepositCreateService } from './deposit-create.service';
import { DepositProofService } from './deposit-proof.service';
import { DepositQueryService } from './deposit-query.service';
import { PrismaModule } from '../prisma.module';
import { RatesModule } from '../rates/rates.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, RatesModule, CloudinaryModule],
  controllers: [DepositsController],
  providers: [DepositCreateService, DepositProofService, DepositQueryService],
})
export class DepositsModule {}
