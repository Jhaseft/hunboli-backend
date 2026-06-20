import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma.service';
import { KycProviderClient } from './kyc-provider.client';

interface JwtUser {
  userId: string;
}

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kycProvider: KycProviderClient,
    private readonly config: ConfigService,
  ) {}

  @Post('start')
  async start(@CurrentUser() user: JwtUser) {
    if (!user?.userId) {
      throw new BadRequestException('Usuario no autenticado');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, kycStatus: true },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (dbUser.kycStatus === KycStatus.VERIFIED) {
      return { status: 'verified' };
    }

    const apiPublicUrl = this.config.get<string>('API_PUBLIC_URL');
    const appPublicUrl = this.config.get<string>('APP_PUBLIC_URL');
    const webhookSecret = this.config.get<string>('KYC_WEBHOOK_SECRET');

    if (!apiPublicUrl || !appPublicUrl || !webhookSecret) {
      throw new InternalServerErrorException('Faltan variables API_PUBLIC_URL, APP_PUBLIC_URL o KYC_WEBHOOK_SECRET.');
    }

    const webhookUrl = `${this.trimTrailingSlash(apiPublicUrl)}/webhooks/kyc?secret=${encodeURIComponent(webhookSecret)}`;
    const nextUrl = `${this.trimTrailingSlash(appPublicUrl)}/dashboard/kyc`;

    const session = await this.kycProvider.createSession({
      webhookUrl,
      nextUrl,
    });

    const expiresAt = this.parseExpiresAt(session.expires_at);

    await this.prisma.user.update({
      where: { id: dbUser.id },
      data: {
        kycStatus: KycStatus.PENDING,
        kycSessionId: session.session_id,
        kycSessionExpiresAt: expiresAt ?? null,
      },
    });

    return {
      redirect_url: session.redirect_url,
      expires_at: session.expires_at ?? null,
    };
  }

  @Get('me')
  async me(@CurrentUser() user: JwtUser) {
    if (!user?.userId) {
      throw new BadRequestException('Usuario no autenticado');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        kycStatus: true,
        kycSessionId: true,
        kycSessionExpiresAt: true,
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      kycStatus: dbUser.kycStatus,
      kycSessionId: dbUser.kycSessionId,
      kycSessionExpiresAt: dbUser.kycSessionExpiresAt,
    };
  }

  private trimTrailingSlash(value: string) {
    return value.replace(/\/+$/, '');
  }

  private parseExpiresAt(value?: string) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }
}
