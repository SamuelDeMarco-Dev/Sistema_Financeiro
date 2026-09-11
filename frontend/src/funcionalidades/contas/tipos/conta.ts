import type { TipoConta } from '@/constantes/tipos-conta';

export interface EscopoRecurso {
  tipo: 'PESSOAL' | 'GRUPO';
  id: string;
  nome: string;
}

export interface Conta {
  id: string;
  nome: string;
  tipo: TipoConta;
  instituicao: string | null;
  saldoInicial: string;
  saldoAtual: string;
  saldoPrevisto: string;
  moeda: string;
  cor: string;
  icone: string;
  incluirNoSaldoTotal: boolean;
  ordem: number;
  arquivada: boolean;
  quantidadeMovimentacoes: number;
  escopo: EscopoRecurso;
  criadoEm: string;
}

export interface ContaResumo {
  id: string;
  nome: string;
  tipo: TipoConta;
  cor: string;
  icone: string;
}

export interface TotalizadoresContas {
  saldoTotal: string;
  quantidadeContas: number;
}
