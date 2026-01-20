import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class RatesService {
  private cacheSeconds = Number(process.env.RATE_CACHE_SECONDS ?? '30');
  private cached:
    | { rate: Prisma.Decimal; source: string; updatedAt: Date; cacheSeconds: number }
    | null = null;

  async getPenToBobRate() {
    const now = new Date();

    if (this.cached) {
      const ageMs = now.getTime() - this.cached.updatedAt.getTime();
      if (ageMs < this.cacheSeconds * 1000) return this.cached;
    }

    // MVP: rate por ENV (luego lo conectas a API real)
    const r = Number(process.env.PEN_TO_BOB_RATE ?? '0');
    if (!Number.isFinite(r) || r <= 0) {
      throw new InternalServerErrorException(
        'PEN_TO_BOB_RATE inválido o no definido',
      );
    }

    this.cached = {
      rate: new Prisma.Decimal(r),
      source: process.env.RATE_SOURCE ?? 'ENV',
      updatedAt: now,
      cacheSeconds: this.cacheSeconds,
    };

    return this.cached;
  }
}
