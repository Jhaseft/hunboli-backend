import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class RatesService {
  getPenToBobRate() {
    const r = Number(process.env.PEN_TO_BOB_RATE ?? '0');
    if (!Number.isFinite(r) || r <= 0) {
      throw new InternalServerErrorException(
        'PEN_TO_BOB_RATE inválido o no definido',
      );
    }
    return {
      rate: new Prisma.Decimal(r),
      source: process.env.RATE_SOURCE ?? 'ENV',
      updatedAt: new Date(),
      cacheSeconds: Number(process.env.RATE_CACHE_SECONDS ?? '30'),
    };
  }
}
