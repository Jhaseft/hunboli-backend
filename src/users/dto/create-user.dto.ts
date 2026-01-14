import {
  IsEmail,
  IsString,
  IsEnum,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';

// Asegúrate de que este Enum coincida con tu schema.prisma
export enum Country {
  BOLIVIA = 'BOLIVIA',
  PERU = 'PERU',
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEnum(Country)
  country: Country;

  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message:
      'La dirección de la billetera no es válida (debe ser formato Ethereum)',
  })
  walletAddress?: string;

  @IsOptional()
  @IsString()
  resetPasswordToken?: string;

  @IsOptional()
  @IsString()
  resetPasswordExpiry?: Date;
}
