import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { Periodo } from '@/utilitarios/periodo';
import type { TipoMovimentacao } from '@prisma/client';

export interface AgregadoReceitaDespesa {
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
}

export interface LinhaFluxoCaixa {
  mes: Date;
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

export class DashboardRepositorio {
  /** RF-40, RN-25: soma o `valor` nominal (nao `valorPago`) de receitas e
   * despesas por `dataCompetencia` dentro do periodo, excluindo
   * transferencias e canceladas — mesma agregacao dos totalizadores de
   * listagem (issue #35, `MovimentacaoRepositorio.listarComTotalizadores`),
   * para os dois nunca divergirem para o mesmo filtro. */
  async somarReceitasEDespesas(
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
        situacao: { not: 'CANCELADA' },
        dataCompetencia: { gte: periodo.dataInicio, lte: periodo.dataFim },
      },
      _sum: { valor: true },
    });

    let receitas = new Prisma.Decimal(0);
    let despesas = new Prisma.Decimal(0);
    for (const grupo of grupos) {
      const valor = grupo._sum.valor ?? new Prisma.Decimal(0);
      if (grupo.tipo === 'RECEITA') receitas = valor;
      else if (grupo.tipo === 'DESPESA') despesas = valor;
    }
    return { receitas, despesas };
  }

  /** RN-04: efeito (assinado por tipo) das pendentes/atrasadas com
   * vencimento ate o fim do periodo — restrito as contas elegiveis para o
   * saldo total (RN-05), mesma regra de `calcularSaldoConsolidadoPorUsuario`. */
  async somarEfeitoPendentesAteData(usuarioId: string, dataFim: Date): Promise<Prisma.Decimal> {
    const grupos = await prisma.movimentacao.groupBy({
      by: ['tipo'],
      where: {
        usuarioId,
        excluidoEm: null,
        ehModeloRecorrencia: false,
        situacao: { in: ['PENDENTE', 'ATRASADA'] },
        dataVencimento: { lte: dataFim },
        conta: { incluirNoSaldoTotal: true, arquivadaEm: null },
      },
      _sum: { valor: true },
    });

    let efeito = new Prisma.Decimal(0);
    for (const grupo of grupos) {
      const valor = grupo._sum.valor ?? new Prisma.Decimal(0);
      if (grupo.tipo === 'RECEITA') efeito = efeito.plus(valor);
      else if (grupo.tipo === 'DESPESA') efeito = efeito.minus(valor);
    }
    return efeito;
  }

  /** RF-41, 03-DATABASE.md §8.4: `generate_series` garante um ponto por
   * mes mesmo sem nenhuma movimentacao (o LEFT JOIN nao teria como criar
   * uma linha para um mes ausente) — sem ele o grafico teria lacunas.
   * RN-25: exclui transferencias e canceladas; mesma base de #47. */
  async obterFluxoCaixa(usuarioId: string, periodo: Periodo): Promise<LinhaFluxoCaixa[]> {
    return prisma.$queryRaw<LinhaFluxoCaixa[]>`
      WITH meses AS (
        SELECT generate_series(
          date_trunc('month', ${periodo.dataInicio}::date),
          date_trunc('month', ${periodo.dataFim}::date),
          '1 month'
        )::date AS mes
      )
      SELECT
        ms.mes,
        COALESCE(SUM(CASE WHEN m.tipo = 'RECEITA' THEN m.valor END), 0) AS receitas,
        COALESCE(SUM(CASE WHEN m.tipo = 'DESPESA' THEN m.valor END), 0) AS despesas
      FROM meses ms
      LEFT JOIN movimentacoes m
        ON date_trunc('month', m.data_competencia) = ms.mes
       AND m.usuario_id = ${usuarioId}
       AND m.tipo IN ('RECEITA', 'DESPESA')
       AND m.situacao <> 'CANCELADA'
       AND m.excluido_em IS NULL
       AND m.eh_modelo_recorrencia = false
      GROUP BY ms.mes
      ORDER BY ms.mes
    `;
  }

  /** RF-42, 03-DATABASE.md §8.3: agrupa por categoria RAIZ por padrao —
   * `COALESCE(cat.categoria_pai_id, cat.id)` resolve qualquer subcategoria
   * ao seu pai (categorias tem no maximo 1 nivel de profundidade, RF-21);
   * com `incluirSubcategorias`, agrupa pela propria categoria. Sem
   * categoria (`categoria_id IS NULL`) cai numa linha so, com `grp.id`
   * NULL — o mapeador (#49) resolve para "Sem categoria". RN-25: exclui
   * transferencias (via `tipo` fixo RECEITA/DESPESA) e canceladas. */
  async obterPorCategoria(
    usuarioId: string,
    tipo: TipoMovimentacao,
    periodo: Periodo,
    incluirSubcategorias: boolean,
  ): Promise<LinhaPorCategoria[]> {
    const chaveAgrupamento = incluirSubcategorias
      ? Prisma.sql`cat.id`
      : Prisma.sql`COALESCE(cat.categoria_pai_id, cat.id)`;

    return prisma.$queryRaw<LinhaPorCategoria[]>(Prisma.sql`
      SELECT
        grp.id AS categoria_id,
        grp.nome AS categoria_nome,
        grp.cor AS categoria_cor,
        grp.icone AS categoria_icone,
        SUM(m.valor) AS total,
        COUNT(*)::int AS quantidade
      FROM movimentacoes m
      LEFT JOIN categorias cat ON cat.id = m.categoria_id
      LEFT JOIN categorias grp ON grp.id = ${chaveAgrupamento}
      WHERE m.usuario_id = ${usuarioId}
        AND m.tipo = ${tipo}::"TipoMovimentacao"
        AND m.situacao <> 'CANCELADA'
        AND m.excluido_em IS NULL
        AND m.eh_modelo_recorrencia = false
        AND m.data_competencia BETWEEN ${periodo.dataInicio}::date AND ${periodo.dataFim}::date
      GROUP BY grp.id, grp.nome, grp.cor, grp.icone
      ORDER BY total DESC
    `);
  }

  /** RF-46 (parcial nesta milestone: so vencimentos, orcamento/fatura
   * chegam em M8/M9): quantas pendentes/atrasadas vencem entre hoje e
   * D+7, inclusive nos dois extremos — a contagem alimenta o alerta
   * "N contas vencem nos proximos 7 dias" do endpoint agregado (#50). */
  async contarVencimentosProximos(usuarioId: string, hoje: Date, limite: Date): Promise<number> {
    return prisma.movimentacao.count({
      where: {
        usuarioId,
        excluidoEm: null,
        ehModeloRecorrencia: false,
        situacao: { in: ['PENDENTE', 'ATRASADA'] },
        dataVencimento: { gte: hoje, lte: limite },
      },
    });
  }
}
