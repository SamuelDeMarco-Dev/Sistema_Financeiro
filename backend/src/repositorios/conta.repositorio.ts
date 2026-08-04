import { somar } from '@/utilitarios/dinheiro';
import type { Prisma } from '@prisma/client';

interface ContaComSaldoInicial {
  saldoInicial: Prisma.Decimal;
}
type ContaConsolidavel = ContaComSaldoInicial & {
  incluirNoSaldoTotal: boolean;
  arquivadaEm: Date | null;
  excluidoEm: Date | null;
};

export class ContaRepositorio {
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
