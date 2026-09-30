import type { PapelConvidavel, PapelMembro } from './conta-compartilhada';

export type SituacaoConvite = 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'EXPIRADO' | 'CANCELADO';

export const ROTULO_SITUACAO_CONVITE: Record<SituacaoConvite, string> = {
  PENDENTE: 'Pendente',
  ACEITO: 'Aceito',
  RECUSADO: 'Recusado',
  EXPIRADO: 'Expirado',
  CANCELADO: 'Cancelado',
};

/** 04-API.md §17.1 — resposta do envio. `usuarioJaCadastrado: false` existe
 * para a interface avisar que a pessoa ainda vai precisar se cadastrar
 * antes de aceitar; convidar quem nao tem conta e' permitido (RN-37). */
export interface ConviteEnviado {
  id: string;
  email: string;
  papel: PapelConvidavel;
  situacao: SituacaoConvite;
  expiraEm: string;
  usuarioJaCadastrado: boolean;
}

/** Convite como o administrador do grupo o ve (04-API.md §17.1, rota de
 * listagem por grupo). Traz o e-mail completo — aqui quem le e' quem
 * convidou, ao contrario da previa publica. */
export interface ConviteDoGrupo {
  id: string;
  email: string;
  papel: PapelConvidavel;
  situacao: SituacaoConvite;
  mensagem: string | null;
  expiraEm: string;
  criadoEm: string;
}

/** 04-API.md §17.3 — previa publica, aberta com o token. Nunca dado
 * financeiro, e o e-mail chega mascarado pelo servidor porque o link pode
 * circular fora da caixa de quem foi convidado. */
export interface ConvitePrevia {
  situacao: SituacaoConvite;
  papel: PapelConvidavel;
  expiraEm: string;
  contaCompartilhada: { nome: string };
  enviadoPor: { nome: string };
  emailConvidado: string;
  requerCadastro: boolean;
}

/** 04-API.md §17.2 — o convite recebido nao traz nenhum dado financeiro do
 * grupo: quem ainda nao aceitou nao ve saldo nem movimentacao. */
export interface ConviteRecebido {
  id: string;
  papel: PapelMembro;
  situacao: SituacaoConvite;
  mensagem: string | null;
  expiraEm: string;
  contaCompartilhada: {
    id: string;
    nome: string;
    imagemUrl: string | null;
    quantidadeMembros: number;
  };
  enviadoPor: { id: string; nome: string };
  criadoEm: string;
}

export interface MembroAceito {
  id: string;
  papel: PapelMembro;
  situacao: string;
  contaCompartilhada: { id: string; nome: string };
}
