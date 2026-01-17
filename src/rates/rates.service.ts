import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RatesService {
  constructor(private readonly config: ConfigService) {}

  getRates() {
    const rateStr = this.config.get<string>('PEN_TO_BOB_RATE', '');
    const penToBob = Number(rateStr);

    if (!Number.isFinite(penToBob) || penToBob <= 0) {
      throw new InternalServerErrorException(
        'PEN_TO_BOB_RATE inválido o no definido',
      );
    }

    const bobToPen = 1 / penToBob;

    return {
      pen_to_bob: penToBob,
      bob_to_pen: bobToPen,
      updatedAt: new Date().toISOString(),
      source: 'manual',
    };
  }
}
