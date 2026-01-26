import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { AdminDepositsController } from './admin-deposits.controller';
import { AdminDepositsService } from './admin-deposits.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminDepositsController],
  providers: [AdminDepositsService],
})
export class AdminDepositsModule {}
