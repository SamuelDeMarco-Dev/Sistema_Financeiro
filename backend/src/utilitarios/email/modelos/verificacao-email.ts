import type { EmailParaEnviar } from '@/utilitarios/email/enviador';

export interface DadosVerificacaoEmail {
  nome: string;
  linkVerificacao: string;
}

export function modeloVerificacaoEmail({
  nome,
  linkVerificacao,
}: DadosVerificacaoEmail): Omit<EmailParaEnviar, 'para'> {
  return {
    assunto: 'Confirme seu e-mail — Gerenciador de Finanças',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 20px;">Olá, ${nome}!</h1>
        <p>Falta pouco para começar a usar o Gerenciador de Finanças. Confirme seu e-mail clicando no botão abaixo.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${linkVerificacao}" style="background: #2563EB; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Verificar e-mail
          </a>
        </p>
        <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p><a href="${linkVerificacao}">${linkVerificacao}</a></p>
        <p style="color: #64748B; font-size: 13px;">Este link expira em 24 horas. Se você não se cadastrou no Gerenciador de Finanças, ignore este e-mail.</p>
      </div>
    `,
  };
}
