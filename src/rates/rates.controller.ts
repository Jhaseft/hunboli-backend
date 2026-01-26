import { Controller, Get } from '@nestjs/common';
import { RatesService } from './rates.service';

@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get()
  getRates() {
    const r = this.ratesService.getPenToBobRate();
    return {
      pen_to_bob: r.rate.toString(),
      source: r.source,
      updatedAt: r.updatedAt.toISOString(),
      cacheSeconds: r.cacheSeconds,
    };
  }
}
