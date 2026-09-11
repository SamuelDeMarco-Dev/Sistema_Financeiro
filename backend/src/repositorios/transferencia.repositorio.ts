import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { SituacaoMovimentacao } from '@prisma/client';

const SELECT_PERNA = {
  id: true,
  contaId: true,
  descricao: true,
  valor: true,
  situacao: true,
  sentido: true,
  dataCompetencia: true,
  conta: {
    select: {
      id: true,
      nome: true,
      usuarioId: true,
      contaCompartilhadaId: true,
      usuario: { select: { nome: true } },
      contaCompartilhada: { select: { nome: true } },
    },
  },
} satisfies Prisma.MovimentacaoSelect;

export type PernaTransferencia = Prisma.MovimentacaoGetPayload<{ select: typeof SELECT_PERNA }>;

export interface DadosCriarTransferencia {
  usuarioId: string;
  contaOrigemId: string;
  contaDestinoId: string;
  valor: Prisma.Decimal;
  data: Date;
  descricao: string;
  observacao: string | null;
  efetivada: boolean;
}

export class TransferenciaRepositorio {
  /** RN-23/RN-26: par SAIDA/ENTRADA vinculado por `transferenciaId`
   * (gerado aqui, nao e FK de nenhuma tabela — so uma correlacao), criado
   * atomicamente. `categoriaId` e sempre nulo (RN-25: transferencia nao e
   * receita nem despesa, nao se classifica). */
  async criar(dados: DadosCriarTransferencia): Promise<string> {
    const transferenciaId = randomUUID();
    const situacao: SituacaoMovimentacao = dados.efetivada ? 'PAGA' : 'PENDENTE';
    const valorPago = dados.efetivada ? dados.valor : new Prisma.Decimal(0);
    const dataEfetivacao = dados.efetivada ? dados.data : null;

    await prisma.$transaction([
      prisma.movimentacao.create({
        data: {
          usuarioId: dados.usuarioId,
          contaId: dados.contaOrigemId,
          categoriaId: null,
          tipo: 'TRANSFERENCIA',
          descricao: dados.descricao,
          observacao: dados.observacao,
          valor: dados.valor,
          valorPago,
          situacao,
          dataCompetencia: dados.data,
          dataVencimento: dados.data,
          dataEfetivacao,
          transferenciaId,
          sentido: 'SAIDA',
        },
      }),
      prisma.movimentacao.create({
        data: {
          usuarioId: dados.usuarioId,
          contaId: dados.contaDestinoId,
          categoriaId: null,
          tipo: 'TRANSFERENCIA',
          descricao: dados.descricao,
          observacao: dados.observacao,
          valor: dados.valor,
          valorPago,
          situacao,
          dataCompetencia: dados.data,
          dataVencimento: dados.data,
          dataEfetivacao,
          transferenciaId,
          sentido: 'ENTRADA',
        },
      }),
    ]);

    return transferenciaId;
  }

  /** Retorna as duas pernas (ou nenhuma) — nunca uma so, a nao ser que uma
   * pertenca a outro usuario, caso em que o chamador deve tratar como
   * "nao encontrada" (RN-51: 404, nunca 403). */
  async buscarPorTransferenciaId(
    transferenciaId: string,
    usuarioId: string,
  ): Promise<PernaTransferencia[]> {
    return prisma.movimentacao.findMany({
      where: { transferenciaId, usuarioId, excluidoEm: null },
      select: SELECT_PERNA,
    });
  }

  /** RN-26/RN-39: exclusao logica das duas pernas na mesma transacao. */
  async excluirPorTransferenciaId(transferenciaId: string): Promise<void> {
    await prisma.movimentacao.updateMany({
      where: { transferenciaId, excluidoEm: null },
      data: { excluidoEm: new Date() },
    });
  }
}
