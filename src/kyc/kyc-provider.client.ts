import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

export type KycSessionResponse = {
  session_id: string;
  redirect_url: string;
  expires_at?: string;
  next_url?: string;
};

@Injectable()
export class KycProviderClient {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async createSession(params: { webhookUrl: string; nextUrl: string }): Promise<KycSessionResponse> {
    const baseUrl = this.config.get<string>('KYC_BASE_URL');
    const apiKey = this.config.get<string>('KYC_API_KEY');

    if (!baseUrl || !apiKey) {
      throw new InternalServerErrorException('KYC_BASE_URL o KYC_API_KEY no configurados.');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/api/kyc/session`;

    const { data } = await lastValueFrom(
      this.http.post<KycSessionResponse>(
        url,
        {
          webhook_url: params.webhookUrl,
          next_url: params.nextUrl,
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    return data;
  }
}
