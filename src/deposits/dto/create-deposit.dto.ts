import { IsEnum, IsNumber, Min } from 'class-validator';

export enum FiatCurrencyDto {
  BOB = 'BOB',
  PEN = 'PEN',
}

export class CreateDepositDto {
  @IsEnum(FiatCurrencyDto)
  currency: FiatCurrencyDto;

  @IsNumber()
  @Min(0.01)
  amount: number;
}
