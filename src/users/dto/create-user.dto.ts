import { IsEmail, IsString, IsEnum, MinLength, IsOptional } from 'class-validator';

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

    // 🔴 ANTES TENÍAS ESTO (causante del error):
    // @IsString()
    // name: string; 

    // 🟢 CAMBIALO POR ESTO (lo que pide Prisma):
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsEnum(Country)
    country: Country;

    @IsOptional()
    @IsString()
    walletAddress?: string;
}