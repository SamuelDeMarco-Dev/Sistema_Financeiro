import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import { somar } from '@/utilitarios/dinheiro';
import type { Conta, TipoConta } from '@prisma/client';

interface ContaComSaldoInicial {
  saldoInicial: Prisma.Decimal;
}
type ContaConsolidavel = ContaComSaldoInicial & {
  incluirNoSaldoTotal: boolean;
  arquivadaEm: Date | null;
  excluidoEm: Date | null;
};

export interface DadosCriarConta {
  nome: string;
  tipo: TipoConta;
  instituicao: string | null;
  saldoInicial: Prisma.Decimal;
  cor: string;
  icone: string;
  incluirNoSaldoTotal: boolean;
}

export interface FiltrosListarContas {
  tipos?: TipoConta[] | undefined;
  incluirArquivadas: boolean;
}

export type ContaResumo = Pick<Conta, 'id' | 'nome' | 'tipo' | 'cor' | 'icone'>;

export class ContaRepositorio {
  async listarPorUsuario(usuarioId: string, filtros: FiltrosListarContas): Promise<Conta[]> {
    return prisma.conta.findMany({
      where: {
        usuarioId,
        excluidoEm: null,
        ...(filtros.tipos && filtros.tipos.length > 0 ? { tipo: { in: filtros.tipos } } : {}),
        ...(filtros.incluirArquivadas ? {} : { arquivadaEm: null }),
      },
    });
  }

  async listarResumoPorUsuario(usuarioId: string): Promise<ContaResumo[]> {
    return prisma.conta.findMany({
      where: { usuarioId, excluidoEm: null, arquivadaEm: null },
      select: { id: true, nome: true, tipo: true, cor: true, icone: true },
      orderBy: { ordem: 'asc' },
    });
  }

  async buscarPorId(id: string, usuarioId: string): Promise<Conta | null> {
    return prisma.conta.findFirst({ where: { id, usuarioId, excluidoEm: null } });
  }

  async criar(usuarioId: string, dados: DadosCriarConta): Promise<Conta> {
    return prisma.conta.create({ data: { usuarioId, ...dados } });
  }

  async atualizar(id: string, dados: Prisma.ContaUpdateInput): Promise<Conta> {
    return prisma.conta.update({ where: { id }, data: dados });
  }

  async arquivar(id: string): Promise<Conta> {
    return prisma.conta.update({ where: { id }, data: { arquivadaEm: new Date() } });
  }

  async desarquivar(id: string): Promise<Conta> {
    return prisma.conta.update({ where: { id }, data: { arquivadaEm: null } });
  }

  async reordenar(
    ordens: { id: string; ordem: number }[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await Promise.all(
      ordens.map((item) =>
        tx.conta.update({ where: { id: item.id }, data: { ordem: item.ordem } }),
      ),
    );
  }

  async excluirLogicamente(id: string): Promise<void> {
    await prisma.conta.update({ where: { id }, data: { excluidoEm: new Date() } });
  }

  async contarMovimentacoes(id: string): Promise<number> {
    return prisma.movimentacao.count({ where: { contaId: id, excluidoEm: null } });
  }

  /** RN-01, RN-02, RN-03: soma valorPago (nao valor) das movimentacoes
   * efetivadas (PAGA/PAGA_PARCIALMENTE) — pagamento parcial afeta o saldo
   * so pela parte paga. Transferencias somam por sentido. Modelos de
   * recorrencia e movimentacoes excluidas nunca entram (mesmo filtro do
   * indice parcial idx_mov_saldo). M4 (issue #46) substitui isto por
   * `vw_saldo_conta` para nao repetir esta agregacao em toda consulta. */
  async calcularSaldoAtual(conta: ContaComSaldoInicial & { id: string }): Promise<Prisma.Decimal> {
    const grupos = await prisma.movimentacao.groupBy({
      by: ['tipo', 'sentido'],
      where: {
        contaId: conta.id,
        excluidoEm: null,
        ehModeloRecorrencia: false,
        situacao: { in: ['PAGA', 'PAGA_PARCIALMENTE'] },
      },
      _sum: { valorPago: true },
    });

    let saldo = conta.saldoInicial;
    for (const grupo of grupos) {
      const valor = grupo._sum.valorPago ?? new Prisma.Decimal(0);
      if (grupo.tipo === 'RECEITA') saldo = saldo.plus(valor);
      else if (grupo.tipo === 'DESPESA') saldo = saldo.minus(valor);
      // Unico tipo restante e TRANSFERENCIA — o sinal vem do sentido.
      else if (grupo.sentido === 'ENTRADA') saldo = saldo.plus(valor);
      else if (grupo.sentido === 'SAIDA') saldo = saldo.minus(valor);
    }
    return saldo;
  }

  /** RN-04: saldo atual acrescido das pendentes/atrasadas — sem recorte
   * por periodo ainda (a query com `dataVencimento` dentro da janela do
   * dashboard chega em M4, junto do endpoint que a consome). */
  async calcularSaldoPrevisto(
    conta: ContaComSaldoInicial & { id: string },
  ): Promise<Prisma.Decimal> {
    const saldoAtual = await this.calcularSaldoAtual(conta);
    const grupos = await prisma.movimentacao.groupBy({
      by: ['tipo'],
      where: {
        contaId: conta.id,
        excluidoEm: null,
        ehModeloRecorrencia: false,
        situacao: { in: ['PENDENTE', 'ATRASADA'] },
      },
      _sum: { valor: true },
    });

    let saldo = saldoAtual;
    for (const grupo of grupos) {
      const valor = grupo._sum.valor ?? new Prisma.Decimal(0);
      if (grupo.tipo === 'RECEITA') saldo = saldo.plus(valor);
      else if (grupo.tipo === 'DESPESA') saldo = saldo.minus(valor);
    }
    return saldo;
  }

  /** RN-05: soma apenas contas nao arquivadas, nao excluidas e marcadas
   * para entrar no total. */
  async calcularSaldoConsolidado(
    contas: (ContaConsolidavel & { id: string })[],
  ): Promise<Prisma.Decimal> {
    const elegiveis = contas.filter(
      (conta) => conta.incluirNoSaldoTotal && !conta.arquivadaEm && !conta.excluidoEm,
    );
    const saldos = await Promise.all(elegiveis.map((conta) => this.calcularSaldoAtual(conta)));
    return somar(...saldos);
  }
}
