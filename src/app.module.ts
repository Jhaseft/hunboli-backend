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
import { BanksModule } from './banks/banks.module';
import { RatesModule } from './rates/rates.module';
import { DepositsModule } from './deposits/deposits.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { AdminDepositsModule } from './admin-deposits/admin-deposits.module';
import { RetiroModule } from './retiro/retiro.module';
import { VerificationModule } from './verification/verification.module';
import { RateModule } from './rate/rate.module';
<<<<<<< HEAD
import { AdminRetirosModule } from './admin-retiros/admin-retiros.module';
=======
import { SafeModule } from './safe/safe.module';
>>>>>>> cea5d1ff54c23603a6476488dc183312b5d0af71

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigModule esté disponible en toda la app(osea traer varibales de entorno)
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
    MailModule,
    BanksModule,
    RatesModule,
    DepositsModule,
    BankAccountsModule,
    AdminDepositsModule,
    RetiroModule,
    VerificationModule,
    RateModule,
<<<<<<< HEAD
    AdminRetirosModule,
=======
    SafeModule,
>>>>>>> cea5d1ff54c23603a6476488dc183312b5d0af71
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
