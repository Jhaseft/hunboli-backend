import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TestModule } from './test/test.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,  // Hace que ConfigModule esté disponible en toda la app(osea traer varibales de entorno)
      envFilePath: '.env',
    }),
    PrismaModule,
    TestModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}