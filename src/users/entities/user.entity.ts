import { User, KycStatus, Country, UserRole } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserEntity implements User {

  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  // ✅ CORRECTO: Excluimos el password
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

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false, nullable: true })
  lastLogin: Date | null;

  @Exclude()
  resetPasswordToken: string | null;

  @Exclude()
  resetPasswordExpiry: Date | null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}