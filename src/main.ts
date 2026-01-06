import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Obtener el ConfigService
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 4000;
  const frontendUrl = configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  
  //  Configurar CORS desde variables de entorno
  app.enableCors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });
  
  // Validación global mejorada
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  await app.listen(port);
  console.log(` Servidor corriendo papitos yijuu http://localhost:${port}`);
  console.log(` Cors habilitado para este desgraciao: ${frontendUrl}`);
}
bootstrap();