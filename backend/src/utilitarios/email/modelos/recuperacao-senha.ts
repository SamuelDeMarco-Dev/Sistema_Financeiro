import type { EmailParaEnviar } from '@/utilitarios/email/enviador';

export interface DadosRecuperacaoSenha {
  nome: string;
  linkRecuperacao: string;
}

export function modeloRecuperacaoSenha({
  nome,
  linkRecuperacao,
}: DadosRecuperacaoSenha): Omit<EmailParaEnviar, 'para'> {
  return {
    assunto: 'Redefinição de senha — Gerenciador de Finanças',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 20px;">Olá, ${nome}!</h1>
        <p>Recebemos um pedido para redefinir sua senha. Clique no botão abaixo para escolher uma nova.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${linkRecuperacao}" style="background: #2563EB; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Redefinir senha
          </a>
        </p>
        <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p><a href="${linkRecuperacao}">${linkRecuperacao}</a></p>
        <p style="color: #64748B; font-size: 13px;">Este link expira em 1 hora. Se você não pediu essa redefinição, ignore este e-mail — sua senha continua a mesma.</p>
      </div>
    `,
  };
}
