import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

interface KycWebhookBody {
  session_id?: string;
  status?: string;
  similarity?: number;
  verificado?: boolean;
  face_verified?: boolean;
  liveness?: { score?: number; parpadeo_detectado?: boolean };
}

@Controller('webhooks')
export class KycWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post('kyc')
  async handleKycWebhook(
    @Query('secret') secret: string | undefined,
    @Body() body: KycWebhookBody,
  ) {
    const expected = this.config.get<string>('KYC_WEBHOOK_SECRET');

    if (!expected || !secret || secret !== expected) {
      throw new UnauthorizedException('Webhook secret invalido');
    }

    const sessionId = body?.session_id;
    if (!sessionId) {
      throw new BadRequestException('session_id es requerido');
    }

    if (body.status !== 'approved') {
      return { received: true };
    }

    const user = await this.prisma.user.findFirst({
      where: { kycSessionId: sessionId },
      select: { id: true, kycStatus: true },
    });

    if (!user) {
      return { received: true, ignored: true };
    }

    if (user.kycStatus === KycStatus.VERIFIED) {
      return { received: true, alreadyVerified: true };
    }

    const similarity = typeof body.similarity === 'number' ? body.similarity : undefined;
    const livenessScore = typeof body.liveness?.score === 'number' ? body.liveness.score : undefined;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: KycStatus.VERIFIED,
        ...(similarity !== undefined ? { kycSimilarity: similarity } : {}),
        ...(livenessScore !== undefined ? { kycLivenessScore: livenessScore } : {}),
      },
    });

    return { received: true };
  }
}
