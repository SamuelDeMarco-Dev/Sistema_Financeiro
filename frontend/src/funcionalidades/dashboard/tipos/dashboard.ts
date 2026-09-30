import type { PapelMembro } from '@/funcionalidades/compartilhadas/tipos/conta-compartilhada';
import type { Movimentacao } from '@/funcionalidades/movimentacoes/tipos/movimentacao';

export interface PeriodoDashboard {
  dataInicio: string;
  dataFim: string;
  rotulo: string;
}

export interface Indicadores {
  saldoAtual: string;
  receitas: string;
  despesas: string;
  resultado: string;
  saldoPrevisto: string;
  variacaoReceitas: number;
  variacaoDespesas: number;
  taxaPoupanca: number;
}

export interface FluxoCaixaPonto {
  mes: string;
  rotulo: string;
  receitas: string;
  despesas: string;
  resultado: string;
}

export interface PorCategoriaItem {
  categoria: { id: string; nome: string; cor: string; icone: string };
  total: string;
  percentual: number;
  quantidade: number;
}

export interface ContaResumoDashboard {
  id: string;
  nome: string;
  tipo: string;
  saldoAtual: string;
  cor: string;
  icone: string;
}

/** 04-API.md §22: forma reduzida do item de §16.1 — o dashboard nao traz
 * `resultado` no resumo do mes nem a configuracao do grupo. */
export interface ContaCompartilhadaResumoDashboard {
  id: string;
  nome: string;
  meuPapel: PapelMembro;
  saldoTotal: string;
  quantidadeMembros: number;
  resumoMesAtual: { receitas: string; despesas: string };
}

export type SeveridadeAlerta = 'INFORMACAO' | 'ATENCAO' | 'CRITICO';

export interface Alerta {
  tipo: string;
  severidade: SeveridadeAlerta;
  titulo: string;
  urlAcao: string;
}

export interface Dashboard {
  periodo: PeriodoDashboard;
  indicadores: Indicadores;
  fluxoCaixa: FluxoCaixaPonto[];
  despesasPorCategoria: PorCategoriaItem[];
  receitasPorCategoria: PorCategoriaItem[];
  ultimasMovimentacoes: Movimentacao[];
  contas: ContaResumoDashboard[];
  contasCompartilhadas: ContaCompartilhadaResumoDashboard[];
  metas: unknown[];
  orcamentos: unknown[];
  alertas: Alerta[];
  cartoes: unknown[];
}
