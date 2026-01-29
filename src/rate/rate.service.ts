import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateService {
   constructor(private config: ConfigService){}

  private getComisionMinima(): number {
      return Number(this.config.get('COMISION_MINIMA'));
    }
  
    private getPorcentajeComision(): number {
      return Number(this.config.get('PORCENTAJE'));
    }
  
    private getRateBobToPen(): number {
      return Number(this.config.get('BOB_TO_PEN_RATE'));
    }
  
    private getRateBobToBobh(): number {
      return Number(this.config.get('BOB_TO_BOBH'));
    }
  
  GetCom() {
    return this.getComisionMinima();
  }

  GetPor() {
    return this.getPorcentajeComision();
  }

  GetBOBtoPen() {
    return this.getRateBobToPen();
  }

  GetBobtoBobh() {
    return this.getRateBobToBobh();
  }

}
