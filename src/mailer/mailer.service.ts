import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 1025),
    auth:
      process.env.SMTP_USER || process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  async send(to: string, subject: string, html: string) {
    const from = process.env.SMTP_FROM || 'no-reply@example.com';
    return this.transporter.sendMail({ from, to, subject, html });
  }
}
