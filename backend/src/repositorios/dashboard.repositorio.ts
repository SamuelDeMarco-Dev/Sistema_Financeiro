import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { Periodo } from '@/utilitarios/periodo';

export interface AgregadoReceitaDespesa {
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
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
}
