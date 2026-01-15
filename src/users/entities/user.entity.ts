import { User, KycStatus, Country, UserRole } from '@prisma/client'; // Importas los tipos nativos de Prisma
import { Exclude } from 'class-transformer'; // 👈 ¡ESTO ES CLAVE!
import { ApiProperty } from '@nestjs/swagger';

export class UserEntity implements User {
  // Copiamos los campos de Prisma para tener control sobre ellos

  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  // 🔒 SEGURIDAD: Con @Exclude, este campo NUNCA saldrá de tu API hacia el frontend
  @Exclude()
  password: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ required: false, nullable: true })
  phoneNumber: string | null;

  @ApiProperty({ enum: Country })
  country: Country;

  @ApiProperty({ required: false, nullable: true })
  walletAddress: string | null;

  @ApiProperty({ enum: KycStatus })
  kycStatus: KycStatus;

  @ApiProperty({ enum: UserRole }) // Asumiendo que agregaste roles
  role: UserRole;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false, nullable: true })
  lastLogin: Date | null;

  @ApiProperty({ required: false, nullable: true })
  resetPasswordToken: string | null;

  @ApiProperty({ required: false, nullable: true })
  resetPasswordExpiry: Date | null;

  // Constructor para facilitar la conversión
  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
