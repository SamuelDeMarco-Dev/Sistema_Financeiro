export const TIPOS_MOVIMENTACAO_CRIACAO = ['RECEITA', 'DESPESA'] as const;
export type TipoMovimentacaoCriacao = (typeof TIPOS_MOVIMENTACAO_CRIACAO)[number];

export const TIPOS_MOVIMENTACAO = ['RECEITA', 'DESPESA', 'TRANSFERENCIA'] as const;
export type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number];

export const SITUACOES_MOVIMENTACAO = [
  'PENDENTE',
  'PAGA',
  'PAGA_PARCIALMENTE',
  'ATRASADA',
  'CANCELADA',
] as const;
export type SituacaoMovimentacao = (typeof SITUACOES_MOVIMENTACAO)[number];

export const ROTULO_TIPO_MOVIMENTACAO: Record<TipoMovimentacao, string> = {
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
  TRANSFERENCIA: 'Transferência',
};

export const ROTULO_SITUACAO_MOVIMENTACAO: Record<SituacaoMovimentacao, string> = {
  PENDENTE: 'Pendente',
  PAGA: 'Paga',
  PAGA_PARCIALMENTE: 'Paga parcialmente',
  ATRASADA: 'Atrasada',
  CANCELADA: 'Cancelada',
};

// RN-19/RN-20: os tres escopos de edicao/exclusao de uma ocorrencia de
// recorrencia — o mesmo enum serve os dois casos (04-API.md §12.3/§12.9).
export const ESCOPOS_RECORRENCIA = ['APENAS_ESTA', 'ESTA_E_FUTURAS', 'TODAS'] as const;
export type EscopoRecorrencia = (typeof ESCOPOS_RECORRENCIA)[number];

export const ROTULO_ESCOPO_RECORRENCIA: Record<EscopoRecorrencia, string> = {
  APENAS_ESTA: 'Apenas esta ocorrência',
  ESTA_E_FUTURAS: 'Esta e as futuras',
  TODAS: 'Todas as ocorrências',
};

export interface ContaResumoMovimentacao {
  id: string;
  nome: string;
  cor: string;
  icone: string;
}

export interface CategoriaResumoMovimentacao {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  categoriaPaiId: string | null;
}

export interface EtiquetaResumoMovimentacao {
  id: string;
  nome: string;
  cor: string;
}

export interface TransferenciaResumo {
  transferenciaId: string;
  sentido: 'SAIDA' | 'ENTRADA';
  contraparte: { movimentacaoId: string; conta: { id: string; nome: string } };
}

export interface RecorrenciaResumo {
  modeloId: string;
  frequencia: string;
  intervalo: number;
  fimEm: string | null;
  ocorrenciaAtual: number;
}

export interface ParcelamentoResumo {
  compraParceladaId: string;
  numeroParcela: number;
  totalParcelas: number;
  valorTotal: string;
  rotulo: string;
}

export interface AnexoResumo {
  id: string;
  nomeOriginal: string;
  tipoMime: string;
  tamanhoBytes: number;
  url: string;
  criadoEm: string;
}

export interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  descricao: string;
  observacao: string | null;
  valor: string;
  valorPago: string;
  situacao: SituacaoMovimentacao;
  dataCompetencia: string;
  dataVencimento: string | null;
  dataEfetivacao: string | null;
  conta: ContaResumoMovimentacao | null;
  /** Ligação direta ao grupo (RN-09): preenchida quando a movimentação
   * pertence a uma conta compartilhada sem passar por uma sub-conta. */
  contaCompartilhada: { id: string; nome: string } | null;
  categoria: CategoriaResumoMovimentacao | null;
  cartao: null;
  fatura: null;
  etiquetas: EtiquetaResumoMovimentacao[];
  autor: { id: string; nome: string; fotoUrl: string | null };
  transferencia: TransferenciaResumo | null;
  recorrencia: RecorrenciaResumo | null;
  parcelamento: ParcelamentoResumo | null;
  anexos: AnexoResumo[];
  quantidadeAnexos: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface TotalizadoresMovimentacoes {
  receitas: string;
  despesas: string;
  resultado: string;
  receitasPendentes: string;
  despesasPendentes: string;
}

export interface PaginacaoMovimentacoes {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
  temProxima: boolean;
  temAnterior: boolean;
}
