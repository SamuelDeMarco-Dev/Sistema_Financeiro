import { prisma } from '@/banco/cliente';
import { somar } from '@/utilitarios/dinheiro';
import type { Conta, Prisma, TipoConta } from '@prisma/client';

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

  /** M2: `Movimentacao` ainda nao existe (chega em M3, issue #32) — nenhuma
   * conta pode ter lancamentos ainda, entao a contagem e sempre zero. A
   * exclusao (issue #24) ja fica pronta para o `409 RECURSO_EM_USO` real
   * assim que a tabela existir. */
  // eslint-disable-next-line @typescript-eslint/require-await -- assinatura assincrona preparada para a consulta real em M3.
  async contarMovimentacoes(_id: string): Promise<number> {
    return 0;
  }

  /** RN-01, RN-02, RN-03: nesta Milestone `Movimentacao` ainda nao existe
   * (chega em M3, issue #32) — sem lancamentos para agregar, o saldo
   * atual e o proprio saldo inicial. */
  calcularSaldoAtual(conta: ContaComSaldoInicial): Prisma.Decimal {
    return conta.saldoInicial;
  }

  /** RN-04: soma pendentes/atrasadas vencendo no periodo — nenhuma existe
   * antes de M3, entao o previsto coincide com o atual. */
  calcularSaldoPrevisto(conta: ContaComSaldoInicial): Prisma.Decimal {
    return this.calcularSaldoAtual(conta);
  }

  /** RN-05: soma apenas contas nao arquivadas, nao excluidas e marcadas
   * para entrar no total. */
  calcularSaldoConsolidado(contas: ContaConsolidavel[]): Prisma.Decimal {
    const elegiveis = contas.filter(
      (conta) => conta.incluirNoSaldoTotal && !conta.arquivadaEm && !conta.excluidoEm,
    );
    return somar(...elegiveis.map((conta) => this.calcularSaldoAtual(conta)));
  }
}
