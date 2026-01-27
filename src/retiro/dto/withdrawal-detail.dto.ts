import { IsUUID, IsDecimal, IsOptional, IsString, IsDateString, IsInt } from 'class-validator';

export class CreateWithdrawalDetailDto {
  @IsUUID()
  operationId: string;

  @IsDecimal({ decimal_digits: '0,18' })
  burnedBOBH: string;

  @IsDecimal({ decimal_digits: '0,18' })
  fiatSent: string;

  @IsInt()
  bankAccountId: number;

  @IsOptional()
  @IsString()
  payoutTxRef?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
