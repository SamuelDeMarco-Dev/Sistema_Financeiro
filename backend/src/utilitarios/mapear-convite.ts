import type { ConviteComGrupo } from '@/repositorios/convite.repositorio';
import type { Convite, PapelMembro, SituacaoConvite } from '@prisma/client';

export interface ConviteEnviadoDTO {
  id: string;
  email: string;
  papel: PapelMembro;
  situacao: SituacaoConvite;
  expiraEm: Date;
  usuarioJaCadastrado: boolean;
}

export interface ConviteDoGrupoDTO {
  id: string;
  email: string;
  papel: PapelMembro;
  situacao: SituacaoConvite;
  mensagem: string | null;
  expiraEm: Date;
  criadoEm: Date;
}

export interface ConviteRecebidoDTO {
  id: string;
  papel: PapelMembro;
  situacao: SituacaoConvite;
  mensagem: string | null;
  expiraEm: Date;
  contaCompartilhada: {
    id: string;
    nome: string;
    imagemUrl: string | null;
    quantidadeMembros: number;
  };
  enviadoPor: { id: string; nome: string };
  criadoEm: Date;
}

/** 04-API.md §17.1: `usuarioJaCadastrado` deixa o frontend explicar que o
 * convidado ainda precisara se cadastrar (RN-37), sem expor mais nada
 * sobre a conta dele. */
export function mapearConviteEnviado(
  convite: Convite,
  usuarioJaCadastrado: boolean,
): ConviteEnviadoDTO {
  return {
    id: convite.id,
    email: convite.email,
    papel: convite.papel,
    situacao: convite.situacao,
    expiraEm: convite.expiraEm,
    usuarioJaCadastrado,
  };
}

export function mapearConviteDoGrupo(convite: Convite): ConviteDoGrupoDTO {
  return {
    id: convite.id,
    email: convite.email,
    papel: convite.papel,
    situacao: convite.situacao,
    mensagem: convite.mensagem,
    expiraEm: convite.expiraEm,
    criadoEm: convite.criadoEm,
  };
}

export interface ConvitePreviaDTO {
  situacao: SituacaoConvite;
  papel: PapelMembro;
  expiraEm: Date;
  contaCompartilhada: { nome: string };
  enviadoPor: { nome: string };
  emailConvidado: string;
  requerCadastro: boolean;
}

/** RF-55/issue #71: mascara so o suficiente para o convidado reconhecer o
 * proprio e-mail sem expor a caixa completa a quem o token vier a
 * alcancar — "an***@exemplo.com" para "ana@exemplo.com". */
export function mascararEmail(email: string): string {
  const [local, dominio] = email.split('@');
  if (!local || !dominio) return email;
  const visiveis = local.slice(0, Math.min(2, local.length));
  return `${visiveis}***@${dominio}`;
}

/** 04-API.md §17.3: rota publica — retorna o minimo possivel (nunca
 * saldo, movimentacao, lista de membros ou e-mail completo). */
export function mapearConvitePrevia(
  convite: ConviteComGrupo,
  requerCadastro: boolean,
): ConvitePreviaDTO {
  return {
    situacao: convite.situacao,
    papel: convite.papel,
    expiraEm: convite.expiraEm,
    contaCompartilhada: { nome: convite.contaCompartilhada.nome },
    enviadoPor: { nome: convite.enviadoPor.nome },
    emailConvidado: mascararEmail(convite.email),
    requerCadastro,
  };
}

export function mapearConviteRecebido(
  convite: ConviteComGrupo,
  quantidadeMembros: number,
): ConviteRecebidoDTO {
  return {
    id: convite.id,
    papel: convite.papel,
    situacao: convite.situacao,
    mensagem: convite.mensagem,
    expiraEm: convite.expiraEm,
    contaCompartilhada: { ...convite.contaCompartilhada, quantidadeMembros },
    enviadoPor: convite.enviadoPor,
    criadoEm: convite.criadoEm,
  };
}
