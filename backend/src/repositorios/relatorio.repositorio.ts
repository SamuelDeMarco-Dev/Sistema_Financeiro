import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { Periodo } from '@/utilitarios/periodo';
import type { TipoMovimentacao } from '@prisma/client';

export interface AgregadoReceitaDespesa {
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
}

export interface LinhaPorCategoria {
  categoria_id: string | null;
  categoria_nome: string | null;
  categoria_cor: string | null;
  categoria_icone: string | null;
  total: Prisma.Decimal;
  quantidade: number;
}

export interface LinhaPorConta {
  conta_id: string;
  conta_nome: string;
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
}

export interface LinhaPorDia {
  dia: Date;
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
}

export interface LinhaMaiorDespesa {
  id: string;
  descricao: string;
  valor_pago: Prisma.Decimal;
  data_efetivacao: Date;
  categoria_nome: string | null;
}

export interface LinhaPorMes {
  mes: Date;
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
}

interface LinhaSaldo {
  saldo: Prisma.Decimal;
}

/** Base compartilhada por todas as consultas deste repositorio: RN-01/
 * RN-02/RN-03 na integra (valorPago, situacao PAGA/PAGA_PARCIALMENTE,
 * dataEfetivacao) — um relatorio de fechamento e um extrato de caixa, nao
 * uma projecao por competencia (isso e o dashboard, #47). Por isso as
 * consultas daqui usam `valor_pago`/`data_efetivacao`, nunca `valor`/
 * `data_competencia`: e o que faz `saldoFinal = saldoInicial + resultado`
 * fechar exatamente (issue #51). */
export class RelatorioRepositorio {
  /** Saldo consolidado do usuario no instante imediatamente anterior a
   * `data` (exclusive) — usado como saldoInicial/saldoFinal do relatorio
   * mensal, calculando cada extremo do periodo de forma independente em
   * vez de derivar um do outro por aritmetica. */
  async calcularSaldoAntesDe(usuarioId: string, data: Date): Promise<Prisma.Decimal> {
    const linhas = await prisma.$queryRaw<LinhaSaldo[]>`
      SELECT COALESCE(SUM(sub.saldo_conta), 0) AS saldo
      FROM (
        SELECT c.saldo_inicial + COALESCE(SUM(
          CASE
            WHEN m.tipo = 'RECEITA' THEN m.valor_pago
            WHEN m.tipo = 'DESPESA' THEN -m.valor_pago
            WHEN m.tipo = 'TRANSFERENCIA' AND m.sentido = 'ENTRADA' THEN m.valor_pago
            WHEN m.tipo = 'TRANSFERENCIA' AND m.sentido = 'SAIDA'   THEN -m.valor_pago
          END
        ), 0) AS saldo_conta
        FROM contas c
        LEFT JOIN movimentacoes m
          ON m.conta_id = c.id
         AND m.excluido_em IS NULL
         AND m.eh_modelo_recorrencia = false
         AND m.situacao IN ('PAGA', 'PAGA_PARCIALMENTE')
         AND m.data_efetivacao < ${data}::date
        WHERE c.usuario_id = ${usuarioId}
          AND c.excluido_em IS NULL
          AND c.arquivada_em IS NULL
          AND c.incluir_no_saldo_total = true
        GROUP BY c.id, c.saldo_inicial
      ) sub
    `;
    return linhas[0]?.saldo ?? new Prisma.Decimal(0);
  }

  /** RN-25: exclui transferencias (tipo fixo RECEITA/DESPESA); so conta o
   * que de fato efetivou (cash basis) dentro do periodo. */
  async somarReceitasEDespesasEfetivadas(
    usuarioId: string,
    periodo: Periodo,
  ): Promise<AgregadoReceitaDespesa> {
    const grupos = await prisma.movimentacao.groupBy({
      by: ['tipo'],
      where: {
        usuarioId,
        excluidoEm: null,
        ehModeloRecorrencia: false,
        tipo: { in: ['RECEITA', 'DESPESA'] },
        situacao: { in: ['PAGA', 'PAGA_PARCIALMENTE'] },
        dataEfetivacao: { gte: periodo.dataInicio, lte: periodo.dataFim },
      },
      _sum: { valorPago: true },
    });

    let receitas = new Prisma.Decimal(0);
    let despesas = new Prisma.Decimal(0);
    for (const grupo of grupos) {
      const valor = grupo._sum.valorPago ?? new Prisma.Decimal(0);
      if (grupo.tipo === 'RECEITA') receitas = valor;
      else if (grupo.tipo === 'DESPESA') despesas = valor;
    }
    return { receitas, despesas };
  }

  /** Mesma agregacao por categoria de #49, mas em base de caixa — ver
   * nota de classe. */
  async obterPorCategoriaEfetivada(
    usuarioId: string,
    tipo: TipoMovimentacao,
    periodo: Periodo,
  ): Promise<LinhaPorCategoria[]> {
    return prisma.$queryRaw<LinhaPorCategoria[]>(Prisma.sql`
      SELECT
        grp.id AS categoria_id,
        grp.nome AS categoria_nome,
        grp.cor AS categoria_cor,
        grp.icone AS categoria_icone,
        SUM(m.valor_pago) AS total,
        COUNT(*)::int AS quantidade
      FROM movimentacoes m
      LEFT JOIN categorias cat ON cat.id = m.categoria_id
      LEFT JOIN categorias grp ON grp.id = COALESCE(cat.categoria_pai_id, cat.id)
      WHERE m.usuario_id = ${usuarioId}
        AND m.tipo = ${tipo}::"TipoMovimentacao"
        AND m.situacao IN ('PAGA', 'PAGA_PARCIALMENTE')
        AND m.excluido_em IS NULL
        AND m.eh_modelo_recorrencia = false
        AND m.data_efetivacao BETWEEN ${periodo.dataInicio}::date AND ${periodo.dataFim}::date
      GROUP BY grp.id, grp.nome, grp.cor, grp.icone
      ORDER BY total DESC
    `);
  }

  async obterPorConta(usuarioId: string, periodo: Periodo): Promise<LinhaPorConta[]> {
    return prisma.$queryRaw<LinhaPorConta[]>`
      SELECT
        c.id AS conta_id,
        c.nome AS conta_nome,
        COALESCE(SUM(CASE WHEN m.tipo = 'RECEITA' THEN m.valor_pago END), 0) AS receitas,
        COALESCE(SUM(CASE WHEN m.tipo = 'DESPESA' THEN m.valor_pago END), 0) AS despesas
      FROM contas c
      JOIN movimentacoes m
        ON m.conta_id = c.id
       AND m.tipo IN ('RECEITA', 'DESPESA')
       AND m.situacao IN ('PAGA', 'PAGA_PARCIALMENTE')
       AND m.excluido_em IS NULL
       AND m.eh_modelo_recorrencia = false
       AND m.data_efetivacao BETWEEN ${periodo.dataInicio}::date AND ${periodo.dataFim}::date
      WHERE c.usuario_id = ${usuarioId}
      GROUP BY c.id, c.nome
      ORDER BY c.nome ASC
    `;
  }

  async obterPorDia(usuarioId: string, periodo: Periodo): Promise<LinhaPorDia[]> {
    return prisma.$queryRaw<LinhaPorDia[]>`
      SELECT
        m.data_efetivacao AS dia,
        COALESCE(SUM(CASE WHEN m.tipo = 'RECEITA' THEN m.valor_pago END), 0) AS receitas,
        COALESCE(SUM(CASE WHEN m.tipo = 'DESPESA' THEN m.valor_pago END), 0) AS despesas
      FROM movimentacoes m
      WHERE m.usuario_id = ${usuarioId}
        AND m.tipo IN ('RECEITA', 'DESPESA')
        AND m.situacao IN ('PAGA', 'PAGA_PARCIALMENTE')
        AND m.excluido_em IS NULL
        AND m.eh_modelo_recorrencia = false
        AND m.data_efetivacao BETWEEN ${periodo.dataInicio}::date AND ${periodo.dataFim}::date
      GROUP BY m.data_efetivacao
      ORDER BY m.data_efetivacao ASC
    `;
  }

  async buscarMaioresDespesas(
    usuarioId: string,
    periodo: Periodo,
    limite: number,
  ): Promise<LinhaMaiorDespesa[]> {
    return prisma.$queryRaw<LinhaMaiorDespesa[]>`
      SELECT m.id, m.descricao, m.valor_pago, m.data_efetivacao, cat.nome AS categoria_nome
      FROM movimentacoes m
      LEFT JOIN categorias cat ON cat.id = m.categoria_id
      WHERE m.usuario_id = ${usuarioId}
        AND m.tipo = 'DESPESA'
        AND m.situacao IN ('PAGA', 'PAGA_PARCIALMENTE')
        AND m.excluido_em IS NULL
        AND m.eh_modelo_recorrencia = false
        AND m.data_efetivacao BETWEEN ${periodo.dataInicio}::date AND ${periodo.dataFim}::date
      ORDER BY m.valor_pago DESC
      LIMIT ${limite}
    `;
  }

  /** RF-72 (anual): `generate_series` garante os 12 meses do ano mesmo
   * sem movimentacao — mesmo padrao de `obterFluxoCaixa` (#48). */
  async obterPorMesDoAno(usuarioId: string, ano: number): Promise<LinhaPorMes[]> {
    return prisma.$queryRaw<LinhaPorMes[]>`
      WITH meses AS (
        SELECT generate_series(
          date_trunc('year', make_date(${ano}::int, 1, 1)),
          date_trunc('year', make_date(${ano}::int, 1, 1)) + interval '11 months',
          '1 month'
        )::date AS mes
      )
      SELECT
        ms.mes,
        COALESCE(SUM(CASE WHEN m.tipo = 'RECEITA' THEN m.valor_pago END), 0) AS receitas,
        COALESCE(SUM(CASE WHEN m.tipo = 'DESPESA' THEN m.valor_pago END), 0) AS despesas
      FROM meses ms
      LEFT JOIN movimentacoes m
        ON date_trunc('month', m.data_efetivacao) = ms.mes
       AND m.usuario_id = ${usuarioId}
       AND m.tipo IN ('RECEITA', 'DESPESA')
       AND m.situacao IN ('PAGA', 'PAGA_PARCIALMENTE')
       AND m.excluido_em IS NULL
       AND m.eh_modelo_recorrencia = false
      GROUP BY ms.mes
      ORDER BY ms.mes
    `;
  }
}
