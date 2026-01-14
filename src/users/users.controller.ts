import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  NotFoundException,
  UseGuards,
  Body,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { KycStatus, UserRole } from '@prisma/client';

interface JwtUser {
  userId: string;
  email: string;
  role: UserRole;
  kycStatus: KycStatus;
}

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Obtener mi propio perfil (Ruta Protegida)
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtUser) {
    const foundUser = await this.usersService.findOneById(user.userId);
    if (!foundUser) throw new NotFoundException('Usuario no encontrado');
    return new UserEntity(foundUser);
  }

  // Obtener usuario por ID (Admin o público según tu lógica)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserEntity> {
    const user = await this.usersService.findOneById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return new UserEntity(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('link-wallet')
  async linkWallet(
    @CurrentUser() user: JwtUser,
    @Body() body: { walletAddress: string },
  ) {
    if (!body.walletAddress) {
      throw new BadRequestException(
        'La dirección de la billetera es obligatoria',
      );
    }
    const updatedUser = await this.usersService.update(user.userId, {
      walletAddress: body.walletAddress,
    });
    return {
      message: 'Billetera vinculada exitosamente',
      wallet: updatedUser.walletAddress,
    };
  }
}
