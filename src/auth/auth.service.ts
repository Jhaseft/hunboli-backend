import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { KycStatus } from '@prisma/client';
@Injectable()
export class AuthService {

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }


  async register(CreateUserDto: CreateUserDto) {
    //Encriptar la contraseña antes de guardar
    const hashedPassword = await bcrypt.hash(CreateUserDto.password, 10);

    const newUser = await this.usersService.create({
      ...CreateUserDto,
      password: hashedPassword,
    })
    return this.login(newUser);
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      kycstatus: user.KycStatus

    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        KycStatus: user.kycStatus
      }
    };
  }


}
