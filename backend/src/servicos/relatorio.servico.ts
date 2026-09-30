import { Prisma } from '@prisma/client';
import { RelatorioRepositorio } from '@/repositorios/relatorio.repositorio';
import { deDataIso } from '@/utilitarios/data';
import {
  mapearFluxoAcumulado,
  mapearMaioresDespesas,
  mapearPorCategoriaSimples,
  mapearPorConta,
  mapearPorContaComSaldos,
  mapearPorDia,
  mapearPorMes,
} from '@/utilitarios/mapear-relatorio';
import type {
  MaiorDespesaDTO,
  PontoFluxoAcumuladoDTO,
  PorCategoriaSimplesDTO,
  PorContaComSaldosDTO,
  PorContaDTO,
  PorDiaDTO,
  PorMesDTO,
} from '@/utilitarios/mapear-relatorio';
import { percentualVariacao } from '@/utilitarios/percentual';
import { mesAnteriorCalendario, primeiroEUltimoDiaDoMes } from '@/utilitarios/periodo';
import type { Periodo } from '@/utilitarios/periodo';
import { rotuloMesCompleto } from '@/utilitarios/rotulos-data';
import type {
  ObterRelatorioAnualQuery,
  ObterRelatorioFluxoCaixaQuery,
  ObterRelatorioMensalQuery,
  ObterRelatorioPorCategoriaQuery,
  ObterRelatorioPorContaQuery,
} from '@/validadores/relatorios.validador';

const CASAS_PERCENTUAL = 2;
const MAIORES_DESPESAS_LIMITE = 10;
const MESES_NO_ANO = 12;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

interface ComparativoCampoDTO {
  atual: Prisma.Decimal;
  anterior: Prisma.Decimal;
  variacao: number;
}

export interface RelatorioMensalDTO {
  periodo: { ano: number; mes: number; rotulo: string };
  resumo: {
    receitas: Prisma.Decimal;
    despesas: Prisma.Decimal;
    resultado: Prisma.Decimal;
    saldoInicial: Prisma.Decimal;
    saldoFinal: Prisma.Decimal;
  };
  porCategoria: { receitas: PorCategoriaSimplesDTO[]; despesas: PorCategoriaSimplesDTO[] };
  porConta: PorContaDTO[];
  porDia: PorDiaDTO[];
  maioresDespesas: MaiorDespesaDTO[];
  comparativoMesAnterior: { receitas: ComparativoCampoDTO; despesas: ComparativoCampoDTO };
}

export interface RelatorioAnualDTO {
  ano: number;
  resumo: {
    receitas: Prisma.Decimal;
    despesas: Prisma.Decimal;
    resultado: Prisma.Decimal;
    mediaMensalReceitas: Prisma.Decimal;
    mediaMensalDespesas: Prisma.Decimal;
    taxaPoupancaMedia: number;
  };
  porMes: PorMesDTO[];
  porCategoria: (PorCategoriaSimplesDTO & { mediaMensal: Prisma.Decimal })[];
  melhorMes: { mes: number; resultado: Prisma.Decimal };
  piorMes: { mes: number; resultado: Prisma.Decimal };
}

/** RF-72: relatorios de fechamento — extrato de caixa (RN-01/RN-02/RN-03,
 * valorPago/dataEfetivacao), nao a projecao por competencia do dashboard
 * (#47). Isso e o que garante `saldoFinal = saldoInicial + resultado`:
 * os dois lados vem exatamente da mesma base de efetivacoes. */
export class RelatorioServico {
  constructor(private readonly repositorio = new RelatorioRepositorio()) {}

  async obterMensal(
    usuarioId: string,
    query: ObterRelatorioMensalQuery,
  ): Promise<RelatorioMensalDTO> {
    const periodo = primeiroEUltimoDiaDoMes(new Date(Date.UTC(query.ano, query.mes - 1, 1)));
    const periodoAnterior = mesAnteriorCalendario(query.ano, query.mes);
    const inicioProximoDia = new Date(periodo.dataFim.getTime() + UM_DIA_MS);

    const [
      saldoInicial,
      saldoFinal,
      atual,
      doAnterior,
      despesasCategoria,
      receitasCategoria,
      porContaLinhas,
      porDiaLinhas,
      maioresDespesasLinhas,
    ] = await Promise.all([
      this.repositorio.calcularSaldoAntesDe(usuarioId, periodo.dataInicio),
      this.repositorio.calcularSaldoAntesDe(usuarioId, inicioProximoDia),
      this.repositorio.somarReceitasEDespesasEfetivadas(usuarioId, periodo),
      this.repositorio.somarReceitasEDespesasEfetivadas(usuarioId, periodoAnterior),
      this.repositorio.obterPorCategoriaEfetivada(usuarioId, 'DESPESA', periodo),
      this.repositorio.obterPorCategoriaEfetivada(usuarioId, 'RECEITA', periodo),
      this.repositorio.obterPorConta(usuarioId, periodo),
      this.repositorio.obterPorDia(usuarioId, periodo),
      this.repositorio.buscarMaioresDespesas(usuarioId, periodo, MAIORES_DESPESAS_LIMITE),
    ]);

    const resultado = atual.receitas.minus(atual.despesas);

    return {
      periodo: { ano: query.ano, mes: query.mes, rotulo: rotuloMesCompleto(periodo.dataInicio) },
      resumo: {
        receitas: atual.receitas,
        despesas: atual.despesas,
        resultado,
        saldoInicial,
        saldoFinal,
      },
      porCategoria: {
        receitas: mapearPorCategoriaSimples(receitasCategoria),
        despesas: mapearPorCategoriaSimples(despesasCategoria),
      },
      porConta: mapearPorConta(porContaLinhas),
      porDia: mapearPorDia(porDiaLinhas),
      maioresDespesas: mapearMaioresDespesas(maioresDespesasLinhas),
      comparativoMesAnterior: {
        receitas: {
          atual: atual.receitas,
          anterior: doAnterior.receitas,
          variacao: percentualVariacao(atual.receitas, doAnterior.receitas),
        },
        despesas: {
          atual: atual.despesas,
          anterior: doAnterior.despesas,
          variacao: percentualVariacao(atual.despesas, doAnterior.despesas),
        },
      },
    };
  }

  async obterAnual(usuarioId: string, query: ObterRelatorioAnualQuery): Promise<RelatorioAnualDTO> {
    const periodoAno = {
      dataInicio: new Date(Date.UTC(query.ano, 0, 1)),
      dataFim: new Date(Date.UTC(query.ano, 11, 31)),
    };

    const [linhasPorMes, linhasPorCategoria] = await Promise.all([
      this.repositorio.obterPorMesDoAno(usuarioId, query.ano),
      this.repositorio.obterPorCategoriaEfetivada(usuarioId, 'DESPESA', periodoAno),
    ]);

    const porMes = mapearPorMes(linhasPorMes);
    const receitasAno = somarDecimais(porMes.map((item) => item.receitas));
    const despesasAno = somarDecimais(porMes.map((item) => item.despesas));
    const resultadoAno = receitasAno.minus(despesasAno);
    const mediaMensalReceitas = receitasAno.dividedBy(MESES_NO_ANO);
    const mediaMensalDespesas = despesasAno.dividedBy(MESES_NO_ANO);
    const taxaPoupancaMedia = receitasAno.isZero()
      ? 0
      : Number(resultadoAno.dividedBy(receitasAno).times(100).toDecimalPlaces(CASAS_PERCENTUAL));

    const [melhorMes, piorMes] = encontrarMelhorEPiorMes(porMes);
    const porCategoria = mapearPorCategoriaSimples(linhasPorCategoria).map((item) => ({
      ...item,
      mediaMensal: item.total.dividedBy(MESES_NO_ANO),
    }));

    return {
      ano: query.ano,
      resumo: {
        receitas: receitasAno,
        despesas: despesasAno,
        resultado: resultadoAno,
        mediaMensalReceitas,
        mediaMensalDespesas,
        taxaPoupancaMedia,
      },
      porMes,
      porCategoria,
      melhorMes: { mes: melhorMes.mes, resultado: melhorMes.resultado },
      piorMes: { mes: piorMes.mes, resultado: piorMes.resultado },
    };
  }

  /** RF-73 (#52): periodo livre (dataInicio/dataFim obrigatorias, teto de
   * 5 anos ja validado no schema) — mesma base de caixa da classe, agora
   * com `incluirSubcategorias` (#49 tem o mesmo parametro no dashboard). */
  async obterPorCategoria(
    usuarioId: string,
    query: ObterRelatorioPorCategoriaQuery,
  ): Promise<{
    periodo: { dataInicio: string; dataFim: string };
    tipo: ObterRelatorioPorCategoriaQuery['tipo'];
    itens: PorCategoriaSimplesDTO[];
    total: Prisma.Decimal;
  }> {
    const periodo = periodoDaQuery(query);
    const linhas = await this.repositorio.obterPorCategoriaEfetivada(
      usuarioId,
      query.tipo,
      periodo,
      query.incluirSubcategorias,
    );
    const itens = mapearPorCategoriaSimples(linhas);

    return {
      periodo: { dataInicio: query.dataInicio, dataFim: query.dataFim },
      tipo: query.tipo,
      itens,
      total: somarDecimais(itens.map((item) => item.total)),
    };
  }

  /** RF-73 (#52): saldoInicial/saldoFinal calculados por conta (nao so o
   * consolidado do relatorio mensal) — "soma por conta confere com o
   * total geral do periodo" e satisfeito porque `itens` e `totais` vem
   * da mesma consulta base (`obterPorConta`), so agregada diferente. */
  async obterPorConta(
    usuarioId: string,
    query: ObterRelatorioPorContaQuery,
  ): Promise<{
    periodo: { dataInicio: string; dataFim: string };
    itens: PorContaComSaldosDTO[];
    totais: { receitas: Prisma.Decimal; despesas: Prisma.Decimal; resultado: Prisma.Decimal };
  }> {
    const periodo = periodoDaQuery(query);
    const inicioProximoDia = new Date(periodo.dataFim.getTime() + UM_DIA_MS);

    const [linhas, saldoInicialPorConta, saldoFinalPorConta] = await Promise.all([
      this.repositorio.obterPorConta(usuarioId, periodo),
      this.repositorio.calcularSaldoPorContaAntesDe(usuarioId, periodo.dataInicio),
      this.repositorio.calcularSaldoPorContaAntesDe(usuarioId, inicioProximoDia),
    ]);
    const itens = mapearPorContaComSaldos(linhas, saldoInicialPorConta, saldoFinalPorConta);
    const receitas = somarDecimais(itens.map((item) => item.receitas));
    const despesas = somarDecimais(itens.map((item) => item.despesas));

    return {
      periodo: { dataInicio: query.dataInicio, dataFim: query.dataFim },
      itens,
      totais: { receitas, despesas, resultado: receitas.minus(despesas) },
    };
  }

  /** RF-74 (#52): saldo acumulado a partir do saldoInicial consolidado —
   * "termina no saldo atual da conta" (criterio de aceite) vale quando
   * `dataFim` cobre todas as efetivacoes ja registradas (ex.: hoje). */
  async obterFluxoCaixa(
    usuarioId: string,
    query: ObterRelatorioFluxoCaixaQuery,
  ): Promise<{
    periodo: { dataInicio: string; dataFim: string };
    granularidade: ObterRelatorioFluxoCaixaQuery['granularidade'];
    saldoInicial: Prisma.Decimal;
    pontos: PontoFluxoAcumuladoDTO[];
    saldoFinal: Prisma.Decimal;
  }> {
    const periodo = periodoDaQuery(query);

    const [saldoInicial, linhas] = await Promise.all([
      this.repositorio.calcularSaldoAntesDe(usuarioId, periodo.dataInicio),
      this.repositorio.obterFluxoAcumulado(usuarioId, periodo, query.granularidade),
    ]);
    const pontos = mapearFluxoAcumulado(linhas, saldoInicial);
    const ultimoPonto = pontos[pontos.length - 1];

    return {
      periodo: { dataInicio: query.dataInicio, dataFim: query.dataFim },
      granularidade: query.granularidade,
      saldoInicial,
      pontos,
      saldoFinal: ultimoPonto?.saldoAcumulado ?? saldoInicial,
    };
  }
}

function periodoDaQuery(query: { dataInicio: string; dataFim: string }): Periodo {
  return { dataInicio: deDataIso(query.dataInicio), dataFim: deDataIso(query.dataFim) };
}

function somarDecimais(valores: Prisma.Decimal[]): Prisma.Decimal {
  return valores.reduce((soma, valor) => soma.plus(valor), new Prisma.Decimal(0));
}

/** RF-72: melhor/pior mes pelo `resultado` — em caso de empate, fica o
 * primeiro encontrado (ordem cronologica, ja garantida pelo `generate_series`
 * do repositorio), decisao estavel e previsivel. */
function encontrarMelhorEPiorMes(porMes: PorMesDTO[]): [PorMesDTO, PorMesDTO] {
  const primeiro = porMes[0];
  if (!primeiro) {
    const zero = {
      mes: 1,
      rotulo: '',
      receitas: new Prisma.Decimal(0),
      despesas: new Prisma.Decimal(0),
      resultado: new Prisma.Decimal(0),
    };
    return [zero, zero];
  }
  let melhor = primeiro;
  let pior = primeiro;
  for (const item of porMes) {
    if (item.resultado.greaterThan(melhor.resultado)) melhor = item;
    if (item.resultado.lessThan(pior.resultado)) pior = item;
  }
  return [melhor, pior];
}
