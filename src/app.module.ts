import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TestModule } from './test/test.module';
import { PrismaModule } from './prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,  // Hace que ConfigModule esté disponible en toda la app(osea traer varibales de entorno)
      envFilePath: '.env',
    }),
    PrismaModule,
    TestModule,
    UsersModule,
    AuthModule,
    MailerModule.forRoot({
      transport: {
        host: process.env.EMAIL_HOST,
        port: 587, // 465 para SSL, 587 para TLS
        secure: false, // true para 465, false para otros
        auth: {
          user: process.env.EMAIL_USER, // ⚠️ Poner esto en .env
          pass: process.env.EMAIL_PASS, // ⚠️ NO es tu pass normal (leer nota abajo)
        },
      },
      defaults: {
        from: '"No Reply" <noreply@tuapp.com>',
      },
      template: {
        dir: join(__dirname, 'templates'), // Carpeta donde guardas los HTML
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    MailModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }