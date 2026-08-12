import type { PapelMembro } from './conta-compartilhada';

export type SituacaoConvite = 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'EXPIRADO' | 'CANCELADO';

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
