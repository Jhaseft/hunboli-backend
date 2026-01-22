import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Country, CreateUserDto } from '../users/dto/create-user.dto';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) { }

  async register(createUserDto: CreateUserDto) {
    //Encriptar la contraseña antes de guardar
    if (!createUserDto.password) {
      throw new BadRequestException('La contraseña es requerida para el registro');
    }
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
      isOnboardingCompleted: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;
    return this.login(userWithoutPassword);
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<UserEntity, 'password'> | null> {
    const user = await this.usersService.findOneByEmail(email);
    // Si el usuario no tiene password (cuenta de Google), no puede hacer login con email/password
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  login(user: Omit<UserEntity, 'password'>) {
    this.usersService.updateLastLogin(user.id);
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      kycStatus: user.kycStatus,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: new UserEntity(user),
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user)
      return {
        message:
          'Si el correo existe, se ha enviado un enlace para restablecer la contraseña.',
      };

    const token = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // El token expira en 1 hora
    await this.usersService.update(user.id, {
      resetPasswordToken: token,
      resetPasswordExpiry: expires,
    });

    const resetlink =
      this.configService.get('FRONTEND_URL') + `/reset-password?token=${token}`;
    await this.mailService.sendPasswordReset(user.email, resetlink);

    return {
      message:
        'Si el correo existe, se ha enviado un enlace para restablecer la contraseña.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findOneByResetToken(token);

    if (!user) throw new BadRequestException('Token inválido');
    if (!user.resetPasswordToken)
      throw new BadRequestException('Token inválido');
    if (!user.resetPasswordExpiry)
      throw new BadRequestException('Token inválido');

    // Verificar si expiró
    if (new Date() > user.resetPasswordExpiry) {
      throw new BadRequestException('El token ha expirado');
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar password y LIMPIAR el token
    await this.usersService.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null, // Importante limpiar
      resetPasswordExpiry: null, // Importante limpiar
    });
  }


  // auth.service.ts

  async validateUserByGoogle(profile: any) {
    // 1. Buscamos si ya existe por email
    const user = await this.usersService.findOneByEmail(profile.email);
    if (user) {
      // Si existe, retornamos el usuario para que genere el token
      return user;
    }

    // 2. Si NO existe, lo creamos
    console.log('Creando usuario nuevo desde Google...');

    const newUser = await this.usersService.create({
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      password: '', // No se usa contraseña
      isGoogleAccount: true, // (Opcional) Útil para saber que no debe pedir cambio de pass
      country: Country.BOLIVIA, // O algún valor por defecto o lógica para asignar país
      isOnboardingCompleted: false,
    });

    return newUser;
  }

  // Reutiliza tu método login existente para generar el JWT
  async googleLogin(user: any) {
    // Llama a tu lógica de generar JWT que ya tienes
    return this.login(user);
  }
}
