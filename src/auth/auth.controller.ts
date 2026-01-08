import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // 1. REGISTRO (Sign Up)
  // Ruta: POST /auth/signup
  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    // Llama al servicio que hashea la password y guarda en la BD
    return this.authService.register(createUserDto);
  }

  // 2. INICIO DE SESIÓN (Login)
  // Ruta: POST /auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK) // Cambiamos el código por defecto (201) a 200 OK
  async login(@Body() loginDto: LoginDto) {
    // A. Validar que el usuario existe y la contraseña es correcta
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password
    );

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas (Email o contraseña incorrectos)');
    }

    // B. Si todo está bien, generamos y devolvemos el Token JWT
    return this.authService.login(user);
  }
}