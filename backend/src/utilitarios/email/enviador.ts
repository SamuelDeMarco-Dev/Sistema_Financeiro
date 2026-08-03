import nodemailer from 'nodemailer';
import { ambiente } from '@/configuracao/ambiente';
import { registrador } from '@/utilitarios/registrador';

const transportador = nodemailer.createTransport({
  host: ambiente.SMTP_HOST,
  port: ambiente.SMTP_PORTA,
  secure: ambiente.SMTP_SEGURO,
  auth: ambiente.SMTP_USUARIO
    ? { user: ambiente.SMTP_USUARIO, pass: ambiente.SMTP_SENHA }
    : undefined,
});

export interface EmailParaEnviar {
  para: string;
  assunto: string;
  html: string;
}

/** Nunca lanca: SMTP fora do ar e logado, nao derruba quem chamou. O
 * efeito que motivou o e-mail (ex.: token de verificacao) precisa ser
 * reenviavel por outra rota — enviar e-mail nunca pode ser a unica forma
 * de obter algo que o usuario precisa. */
export async function enviarEmail(email: EmailParaEnviar): Promise<void> {
  try {
    await transportador.sendMail({
      from: ambiente.EMAIL_REMETENTE,
      to: email.para,
      subject: email.assunto,
      html: email.html,
    });
  } catch (erro) {
    registrador.error({ erro, para: email.para }, 'Falha ao enviar e-mail.');
  }
}
