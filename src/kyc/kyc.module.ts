import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KycController } from './kyc.controller';
import { KycWebhookController } from './kyc.webhook.controller';
import { KycProviderClient } from './kyc-provider.client';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [KycController, KycWebhookController],
  providers: [KycProviderClient],
})
export class KycModule {}
