export interface CategoriaSimplesRelatorio {
  nome: string;
  cor: string;
}

export interface ItemPorCategoriaSimples {
  categoria: CategoriaSimplesRelatorio;
  total: string;
  percentual: number;
  quantidade: number;
}

export interface RelatorioMensal {
  periodo: { ano: number; mes: number; rotulo: string };
  resumo: {
    receitas: string;
    despesas: string;
    resultado: string;
    saldoInicial: string;
    saldoFinal: string;
  };
  porCategoria: {
    receitas: ItemPorCategoriaSimples[];
    despesas: ItemPorCategoriaSimples[];
  };
  porConta: { conta: { nome: string }; receitas: string; despesas: string; resultado: string }[];
  porDia: { data: string; receitas: string; despesas: string; resultado: string }[];
  maioresDespesas: {
    id: string;
    descricao: string;
    valor: string;
    data: string;
    categoria: { nome: string };
  }[];
  comparativoMesAnterior: {
    receitas: { atual: string; anterior: string; variacao: number };
    despesas: { atual: string; anterior: string; variacao: number };
  };
}

export interface PontoPorMes {
  mes: number;
  rotulo: string;
  receitas: string;
  despesas: string;
  resultado: string;
}

export interface RelatorioAnual {
  ano: number;
  resumo: {
    receitas: string;
    despesas: string;
    resultado: string;
    mediaMensalReceitas: string;
    mediaMensalDespesas: string;
    taxaPoupancaMedia: number;
  };
  porMes: PontoPorMes[];
  porCategoria: (ItemPorCategoriaSimples & { mediaMensal: string })[];
  melhorMes: { mes: number; resultado: string };
  piorMes: { mes: number; resultado: string };
}

export interface ItemPorCategoriaDetalhado {
  categoria: { id: string; nome: string; cor: string; icone: string };
  total: string;
  percentual: number;
  quantidade: number;
}

export type TipoRelatorioPorCategoria = 'RECEITA' | 'DESPESA';

export interface RelatorioPorCategoria {
  periodo: { dataInicio: string; dataFim: string };
  tipo: TipoRelatorioPorCategoria;
  itens: ItemPorCategoriaDetalhado[];
  total: string;
}

export interface ItemPorContaComSaldos {
  conta: { id: string; nome: string };
  receitas: string;
  despesas: string;
  resultado: string;
  saldoInicial: string;
  saldoFinal: string;
}

export interface RelatorioPorConta {
  periodo: { dataInicio: string; dataFim: string };
  itens: ItemPorContaComSaldos[];
  totais: { receitas: string; despesas: string; resultado: string };
}

export type GranularidadeFluxoCaixa = 'DIARIA' | 'MENSAL';

export interface PontoFluxoAcumulado {
  data: string;
  delta: string;
  saldoAcumulado: string;
}

export interface RelatorioFluxoCaixa {
  periodo: { dataInicio: string; dataFim: string };
  granularidade: GranularidadeFluxoCaixa;
  saldoInicial: string;
  pontos: PontoFluxoAcumulado[];
  saldoFinal: string;
}
