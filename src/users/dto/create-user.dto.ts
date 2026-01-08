import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({
        example: 'Juan Perez',
        description: 'El nombre completo del usuario'
    })
    @IsString()
    name: string;

    @ApiProperty({
        example: 'juan@gmail.com',
        description: 'Correo electrónico único'
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'Abc123456',
        description: 'Contraseña segura (min 6 caracteres)',
        minLength: 6
    })
    @IsString()
    @MinLength(6)
    password: string;
}
