import { prisma } from '@/banco/cliente';
import { deDataIso } from '@/utilitarios/data';
import type { Movimentacao, Prisma, SituacaoMovimentacao, TipoMovimentacao } from '@prisma/client';

let contador = 0;

export interface SobrescritasMovimentacao {
  tipo?: TipoMovimentacao;
  descricao?: string;
  valor?: Prisma.Decimal.Value;
  valorPago?: Prisma.Decimal.Value;
  situacao?: SituacaoMovimentacao;
  dataCompetencia?: string;
  dataVencimento?: string | null;
  dataEfetivacao?: string | null;
  categoriaId?: string | null;
}

/** Cria a movimentação direto no banco (sem passar por HTTP) — usada para
 * montar o estado inicial de testes de invariante/casos-limite, que
 * precisam de várias movimentações variadas sem o custo de uma
 * requisição por item. As mutações em si (pagar/estornar/editar/excluir)
 * continuam passando pela API nesses testes, para exercitar a regra de
 * negócio real. */
export async function fabricarMovimentacao(
  usuarioId: string,
  contaId: string,
  sobrescritas: SobrescritasMovimentacao = {},
): Promise<Movimentacao> {
  contador += 1;
  const tipo = sobrescritas.tipo ?? 'DESPESA';
  const situacao = sobrescritas.situacao ?? 'PENDENTE';
  const efetivada = situacao === 'PAGA' || situacao === 'PAGA_PARCIALMENTE';

  return prisma.movimentacao.create({
    data: {
      usuarioId,
      contaId,
      categoriaId: sobrescritas.categoriaId ?? null,
      tipo,
      descricao: sobrescritas.descricao ?? `Movimentação de Teste ${contador}`,
      valor: sobrescritas.valor ?? '100.00',
      valorPago: sobrescritas.valorPago ?? (efetivada ? (sobrescritas.valor ?? '100.00') : '0.00'),
      situacao,
      dataCompetencia: deDataIso(sobrescritas.dataCompetencia ?? '2026-08-01'),
      dataVencimento: sobrescritas.dataVencimento ? deDataIso(sobrescritas.dataVencimento) : null,
      dataEfetivacao: efetivada
        ? deDataIso(sobrescritas.dataEfetivacao ?? sobrescritas.dataCompetencia ?? '2026-08-01')
        : null,
    },
  });
}
