import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; // Importamos UsersModule
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy'; // Importamos la estrategia
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    UsersModule, // Necesario para usar UsersService
    PassportModule,
    MailModule,
    // Configuración asíncrona del JWT (para leer .env)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' }, // Token dura 1 día
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // Agregamos JwtStrategy aquí
  exports: [AuthService],
})
export class AuthModule {}
