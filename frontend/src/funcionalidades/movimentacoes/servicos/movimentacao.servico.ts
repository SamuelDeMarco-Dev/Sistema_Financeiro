import { api } from '@/servicos/api';
import type {
  EscopoRecorrencia,
  Movimentacao,
  PaginacaoMovimentacoes,
  SituacaoMovimentacao,
  TipoMovimentacao,
  TotalizadoresMovimentacoes,
} from '../tipos/movimentacao';
import type { FrequenciaRecorrencia } from '../utilitarios/recorrencia';

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
  /** 04-API.md §12.1: escopo de grupo. Ausente ⇒ escopo pessoal — a
   * listagem pessoal nunca traz movimentação de grupo, e vice-versa. */
  contaCompartilhadaId?: string;
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

export interface RecorrenciaPayload {
  frequencia: FrequenciaRecorrencia;
  intervalo: number;
  fimEm?: string | undefined;
  totalOcorrencias?: number | undefined;
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
  /** RN-09: XOR com `contaCompartilhadaId` — a movimentação de grupo
   * liga-se por uma sub-conta ou direto ao grupo, nunca pelos dois. */
  contaId?: string | undefined;
  contaCompartilhadaId?: string | undefined;
  categoriaId: string;
  etiquetaIds?: string[] | undefined;
  recorrencia?: RecorrenciaPayload | undefined;
}

export type AtualizarMovimentacaoPayload = Partial<
  Omit<CriarMovimentacaoPayload, 'contaId' | 'tipo' | 'recorrencia'>
> & {
  tipo?: 'RECEITA' | 'DESPESA' | undefined;
  escopoEdicao?: EscopoRecorrencia | undefined;
};

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

export async function excluirMovimentacao(
  id: string,
  escopoExclusao?: EscopoRecorrencia,
): Promise<void> {
  await api.delete(`/movimentacoes/${id}`, {
    ...(escopoExclusao && { params: { escopoExclusao } }),
  });
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
