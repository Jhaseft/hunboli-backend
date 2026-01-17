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
import { LinkWalletDto } from './dto/link-wallet.dto';
import { AuthService } from '../auth/auth.service';

interface JwtUser {
  userId: string;
  email: string;
  firstName: string;
  kycStatus: KycStatus;
}

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) { }

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
    @Body() body: LinkWalletDto,
  ) {
    if (!body.walletAddress) {
      throw new BadRequestException(
        'La dirección de la billetera es obligatoria',
      );
    }

    // Verificar la contraseña antes de vincular la billetera
    const validUser = await this.authService.validateUser(
      user.email,
      body.password,
    );
    if (!validUser) {
      throw new BadRequestException('Contraseña incorrecta');
    }
    // Actualizar la dirección de la billetera en el perfil del usuario
    const updatedUser = await this.usersService.update(user.userId, {
      walletAddress: body.walletAddress,
    });
    return {
      success: true,
      message: 'Billetera vinculada correctamente',
      walletAddress: updatedUser.walletAddress
    };
  }
}
