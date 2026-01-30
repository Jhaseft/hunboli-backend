import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { SafeModule } from '../safe/safe.module';
import { AdminDepositsController } from './admin-deposits.controller';
import { AdminDepositsService } from './admin-deposits.service';

@Module({
  imports: [PrismaModule, SafeModule],
  controllers: [AdminDepositsController],
  providers: [AdminDepositsService],
})
export class AdminDepositsModule {}
