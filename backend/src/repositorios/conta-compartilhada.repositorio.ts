import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { Periodo } from '@/utilitarios/periodo';
import type { ContaCompartilhada, TipoConta } from '@prisma/client';

export interface DadosCriarContaCompartilhada {
  nome: string;
  descricao: string | null;
  moeda: string;
  cor: string;
  permiteParticipanteEditarProprias: boolean;
}

export interface ResumoReceitaDespesa {
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
}

export interface ContaDoGrupoResumo {
  id: string;
  nome: string;
  tipo: TipoConta;
  cor: string;
  icone: string;
  saldoAtual: Prisma.Decimal;
}

interface LinhaVwSaldoConta {
  saldo_atual: Prisma.Decimal;
}

interface LinhaSaldoDireto {
  saldo_direto: Prisma.Decimal;
}

interface LinhaContaDoGrupo {
  id: string;
  nome: string;
  tipo: TipoConta;
  cor: string;
  icone: string;
  saldo_atual: Prisma.Decimal;
}

export class ContaCompartilhadaRepositorio {
  async criar(
    criadoPorId: string,
    dados: DadosCriarContaCompartilhada,
    tx: Prisma.TransactionClient,
  ): Promise<ContaCompartilhada> {
    return tx.contaCompartilhada.create({ data: { criadoPorId, ...dados } });
  }

  async buscarPorId(id: string): Promise<ContaCompartilhada | null> {
    return prisma.contaCompartilhada.findFirst({ where: { id, excluidoEm: null } });
  }

  async atualizar(
    id: string,
    dados: Prisma.ContaCompartilhadaUpdateInput,
  ): Promise<ContaCompartilhada> {
    return prisma.contaCompartilhada.update({ where: { id }, data: dados });
  }

  async excluirLogicamente(id: string): Promise<void> {
    await prisma.contaCompartilhada.update({ where: { id }, data: { excluidoEm: new Date() } });
  }

  async contarContasAtivas(contaCompartilhadaId: string): Promise<number> {
    return prisma.conta.count({ where: { contaCompartilhadaId, excluidoEm: null } });
  }

  async listarContasComSaldo(contaCompartilhadaId: string): Promise<ContaDoGrupoResumo[]> {
    const linhas = await prisma.$queryRaw<LinhaContaDoGrupo[]>`
      SELECT c.id, c.nome, c.tipo, c.cor, c.icone, v.saldo_atual
      FROM contas c
      JOIN vw_saldo_conta v ON v.conta_id = c.id
      WHERE c.conta_compartilhada_id = ${contaCompartilhadaId}
        AND c.excluido_em IS NULL
        AND c.arquivada_em IS NULL
      ORDER BY c.ordem ASC
    `;
    return linhas.map((linha) => ({
      id: linha.id,
      nome: linha.nome,
      tipo: linha.tipo,
      cor: linha.cor,
      icone: linha.icone,
      saldoAtual: linha.saldo_atual,
    }));
  }

  /** RN-05 aplicado ao grupo: soma so as contas do grupo marcadas para
   * entrar no total, nao arquivadas nem excluidas — mesma elegibilidade
   * de `ContaRepositorio.calcularSaldoConsolidado`, via `vw_saldo_conta`
   * (nao materializada, ADR-005) para nao repetir o `groupBy` aqui. Soma
   * ainda o saldo das movimentacoes ligadas DIRETO ao grupo (issue #72,
   * `calcularSaldoDireto`) — as duas parcelas nunca se sobrepoem
   * (`chk_mov_escopo` garante contaId XOR contaCompartilhadaId por
   * movimentacao). */
  async calcularSaldoTotal(contaCompartilhadaId: string): Promise<Prisma.Decimal> {
    const [saldoSubContas, saldoDireto] = await Promise.all([
      this.calcularSaldoSubContas(contaCompartilhadaId),
      this.calcularSaldoDireto(contaCompartilhadaId),
    ]);
    return saldoSubContas.plus(saldoDireto);
  }

  private async calcularSaldoSubContas(contaCompartilhadaId: string): Promise<Prisma.Decimal> {
    const linhas = await prisma.$queryRaw<LinhaVwSaldoConta[]>`
      SELECT COALESCE(SUM(v.saldo_atual), 0) AS saldo_atual
      FROM vw_saldo_conta v
      JOIN contas c ON c.id = v.conta_id
      WHERE v.conta_compartilhada_id = ${contaCompartilhadaId}
        AND c.incluir_no_saldo_total = true
        AND c.arquivada_em IS NULL
    `;
    return linhas[0]?.saldo_atual ?? new Prisma.Decimal(0);
  }

  /** RN-01 aplicada a movimentacoes ligadas DIRETO ao grupo (sem Conta,
   * issue #72) — mesma formula de `vw_saldo_conta`, mas sem saldoInicial
   * (nao existe "saldo inicial" para um grupo sem conta) e sem o ramo de
   * TRANSFERENCIA (que so existe entre Contas, RN-23). */
  async calcularSaldoDireto(contaCompartilhadaId: string): Promise<Prisma.Decimal> {
    const linhas = await prisma.$queryRaw<LinhaSaldoDireto[]>`
      SELECT COALESCE(SUM(
        CASE
          WHEN tipo = 'RECEITA' THEN valor_pago
          WHEN tipo = 'DESPESA' THEN -valor_pago
          ELSE 0
        END), 0) AS saldo_direto
      FROM movimentacoes
      WHERE conta_compartilhada_id = ${contaCompartilhadaId}
        AND excluido_em IS NULL
        AND eh_modelo_recorrencia = false
        AND situacao IN ('PAGA', 'PAGA_PARCIALMENTE')
    `;
    return linhas[0]?.saldo_direto ?? new Prisma.Decimal(0);
  }

  /** RN-12: por competencia, como o restante dos relatorios — nao conta
   * transferencias (RN-25) nem modelos de recorrencia ainda nao
   * materializados. Cobre as duas formas de ligacao ao grupo (issue #72):
   * direta (`contaCompartilhadaId`) e via sub-conta (`conta.
   * contaCompartilhadaId`) — mesmo raciocinio de `calcularSaldoTotal`. */
  async calcularResumoPeriodo(
    contaCompartilhadaId: string,
    periodo: Periodo,
  ): Promise<ResumoReceitaDespesa> {
    const grupos = await prisma.movimentacao.groupBy({
      by: ['tipo'],
      where: {
        OR: [{ contaCompartilhadaId }, { conta: { contaCompartilhadaId } }],
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
}
