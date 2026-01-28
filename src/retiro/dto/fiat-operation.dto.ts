import { IsEnum, IsString, IsOptional, IsDecimal, IsDateString } from 'class-validator';

import { FiatCurrency } from '@prisma/client';

export class CreateFiatOperationDto {
  @IsEnum(FiatCurrency)
  currency: FiatCurrency;

  @IsDecimal({ decimal_digits: '0,18' })
  amount: string;

  @IsDecimal({ decimal_digits: '0,6' })
  feeRate: string;

  @IsDecimal({ decimal_digits: '0,18' })
  serviceFee: string;

  @IsDecimal({ decimal_digits: '0,18' })
  totalAmount: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,18' })
  rateUsed?: string;

  @IsOptional()
  @IsString()
  rateSource?: string;

  @IsOptional()
  @IsDateString()
  rateQuotedAt?: string;

  @IsOptional()
  @IsDateString()
  rateExpiresAt?: string;

  @IsString()
  referenceCode: string;
}
