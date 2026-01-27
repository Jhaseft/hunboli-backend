import { IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { FiatOperationStatus } from '@prisma/client';

export class UpdateFiatOperationStatusDto {
  @IsEnum(FiatOperationStatus)
  status: FiatOperationStatus;

  @IsOptional()
  @IsUUID()
  validatedById?: string;

  @IsOptional()
  @IsDateString()
  validatedAt?: string;

  @IsOptional()
  @IsDateString()
  processedAt?: string;
}
