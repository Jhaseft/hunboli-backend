import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendPasswordReset(email: string, resetLink: string) {
    const url = resetLink;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Recuperación de contraseña',
      // Opción A: HTML directo (rápido para probar)
      html: `
        <h1>Recuperar contraseña</h1>
        <p>Haz clic en el siguiente enlace para cambiar tu contraseña:</p>
        <a href="${url}">Cambiar contraseña</a>
        <p>Este enlace expira en 1 hora.</p>
      `,
    });
  }
}
