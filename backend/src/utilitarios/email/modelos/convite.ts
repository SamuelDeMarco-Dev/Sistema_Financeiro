import type { EmailParaEnviar } from '@/utilitarios/email/enviador';

export interface DadosConviteEmail {
  nomeGrupo: string;
  nomeRemetente: string;
  mensagem: string | null;
  linkConvite: string;
}

export function modeloConviteEmail({
  nomeGrupo,
  nomeRemetente,
  mensagem,
  linkConvite,
}: DadosConviteEmail): Omit<EmailParaEnviar, 'para'> {
  return {
    assunto: `${nomeRemetente} convidou você para "${nomeGrupo}" — Gerenciador de Finanças`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 20px;">${nomeRemetente} convidou você!</h1>
        <p>Você foi convidado para participar da conta compartilhada <strong>${nomeGrupo}</strong> no Gerenciador de Finanças.</p>
        ${mensagem ? `<p style="background: #F1F5F9; padding: 12px; border-radius: 8px;">"${mensagem}"</p>` : ''}
        <p style="text-align: center; margin: 32px 0;">
          <a href="${linkConvite}" style="background: #2563EB; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Ver convite
          </a>
        </p>
        <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p><a href="${linkConvite}">${linkConvite}</a></p>
        <p style="color: #64748B; font-size: 13px;">Este convite expira em 7 dias. Se você não esperava este e-mail, ignore-o.</p>
      </div>
    `,
  };
}
