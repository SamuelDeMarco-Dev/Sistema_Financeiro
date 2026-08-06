import { api } from '@/servicos/api';
import type {
  Movimentacao,
  PaginacaoMovimentacoes,
  SituacaoMovimentacao,
  TipoMovimentacao,
  TotalizadoresMovimentacoes,
} from '../tipos/movimentacao';

export interface FiltrosListarMovimentacoes {
  dataInicio?: string;
  dataFim?: string;
  campoData?: 'COMPETENCIA' | 'VENCIMENTO' | 'EFETIVACAO';
  tipo?: TipoMovimentacao[];
  situacao?: SituacaoMovimentacao[];
  contaId?: string[];
  categoriaId?: string[];
  etiquetaId?: string[];
  busca?: string;
  pagina?: number;
  limite?: number;
  ordenarPor?: 'dataCompetencia' | 'dataVencimento' | 'valor' | 'descricao' | 'criadoEm';
  ordem?: 'asc' | 'desc';
}

export interface RespostaListarMovimentacoes {
  movimentacoes: Movimentacao[];
  paginacao: PaginacaoMovimentacoes;
  totalizadores: TotalizadoresMovimentacoes;
}

interface EnvelopeListarMovimentacoes {
  data: { movimentacoes: Movimentacao[] };
  meta: { paginacao: PaginacaoMovimentacoes; totalizadores: TotalizadoresMovimentacoes };
}

export interface CriarMovimentacaoPayload {
  tipo: 'RECEITA' | 'DESPESA';
  descricao: string;
  observacao?: string | undefined;
  valor: string;
  dataCompetencia: string;
  dataVencimento?: string | undefined;
  situacao?: SituacaoMovimentacao | undefined;
  dataEfetivacao?: string | undefined;
  valorPago?: string | undefined;
  contaId: string;
  categoriaId: string;
  etiquetaIds?: string[] | undefined;
}

export type AtualizarMovimentacaoPayload = Partial<
  Omit<CriarMovimentacaoPayload, 'contaId' | 'tipo'>
> & { tipo?: 'RECEITA' | 'DESPESA' | undefined };

export interface PagarMovimentacaoPayload {
  dataEfetivacao?: string | undefined;
  valorPago?: string | undefined;
}

export async function listarMovimentacoes(
  filtros: FiltrosListarMovimentacoes = {},
): Promise<RespostaListarMovimentacoes> {
  const resposta = await api.get<EnvelopeListarMovimentacoes>('/movimentacoes', {
    params: filtros,
  });
  return {
    movimentacoes: resposta.data.data.movimentacoes,
    paginacao: resposta.data.meta.paginacao,
    totalizadores: resposta.data.meta.totalizadores,
  };
}

export async function buscarMovimentacao(id: string): Promise<Movimentacao> {
  const resposta = await api.get<{ data: { movimentacao: Movimentacao } }>(`/movimentacoes/${id}`);
  return resposta.data.data.movimentacao;
}

export async function criarMovimentacao(dados: CriarMovimentacaoPayload): Promise<Movimentacao> {
  const resposta = await api.post<{ data: { movimentacao: Movimentacao } }>(
    '/movimentacoes',
    dados,
  );
  return resposta.data.data.movimentacao;
}

export async function atualizarMovimentacao(
  id: string,
  dados: AtualizarMovimentacaoPayload,
): Promise<Movimentacao> {
  const resposta = await api.patch<{ data: { movimentacao: Movimentacao } }>(
    `/movimentacoes/${id}`,
    dados,
  );
  return resposta.data.data.movimentacao;
}

export async function excluirMovimentacao(id: string): Promise<void> {
  await api.delete(`/movimentacoes/${id}`);
}

export async function duplicarMovimentacao(id: string): Promise<Movimentacao> {
  const resposta = await api.post<{ data: { movimentacao: Movimentacao } }>(
    `/movimentacoes/${id}/duplicar`,
    {},
  );
  return resposta.data.data.movimentacao;
}

export async function pagarMovimentacao(
  id: string,
  dados: PagarMovimentacaoPayload = {},
): Promise<Movimentacao> {
  const resposta = await api.patch<{ data: { movimentacao: Movimentacao } }>(
    `/movimentacoes/${id}/pagar`,
    dados,
  );
  return resposta.data.data.movimentacao;
}

export async function estornarMovimentacao(id: string): Promise<Movimentacao> {
  const resposta = await api.patch<{ data: { movimentacao: Movimentacao } }>(
    `/movimentacoes/${id}/estornar`,
  );
  return resposta.data.data.movimentacao;
}
