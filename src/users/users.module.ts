import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../prisma/prisma.module'; // 👈 1. Asegúrate de importar esto

@Module({
  imports: [PrismaModule], // 👈 2. ¡ESTO ES LO QUE TE FALTA!
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }