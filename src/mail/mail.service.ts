import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  // ========================================================
  // COMO CREAR UN NUEVO EMAIL:
  // 1. Copia cualquier .hbs de src/mail/templates/
  // 2. Cambia el titulo (h2), el texto y el boton
  // 3. Crea una funcion aqui abajo siguiendo el mismo patron
  // Las variables que pongas en context: {} las usas en el .hbs con {{variable}}
  // Es obligatorio  siempre poner el year y el subject si no se rompera layout del email dinamico
  // ========================================================

  async sendPasswordReset(email: string, resetLink: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Recuperación de contraseña',
      template: 'password-reset',
      context: {
        subject: 'Recuperación de contraseña',
        url: resetLink,
        year: new Date().getFullYear(),
      },
    });
  }

  async sendEmailConfirmation(email: string, confirmLink: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Confirma tu correo electrónico',
      template: 'email-confirmation',
      context: {
        subject: 'Confirma tu correo electrónico',
        url: confirmLink,
        year: new Date().getFullYear(),
      },
    });
  }

  async send6DigitCode(email: string, code: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Código de verificación - HUNBOLI',
      html: `
        <h1>Código de verificación</h1>
        <p>Tu código de verificación es: <strong>${code}</strong></p>
      `,
    });
  }
}
