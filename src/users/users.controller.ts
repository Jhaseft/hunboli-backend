import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  NotFoundException,
  UseGuards,
  Request
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // (Descomenta cuando tengas el Guard)

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor) // 🛡️ Oculta la password en la respuesta
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // Obtener mi propio perfil (Ruta Protegida)
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    // req.user viene del JWT decodificado
    const user = await this.usersService.findOneById(req.user.userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return new UserEntity(user);
  }

  // Obtener usuario por ID (Admin o público según tu lógica)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserEntity> {
    const user = await this.usersService.findOneById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return new UserEntity(user);
  }
}