import { prisma } from '@/banco/cliente';
import type { Prisma, SituacaoMovimentacao, TipoMovimentacao } from '@prisma/client';

const INCLUDE_COMPLETO = {
  conta: { select: { id: true, nome: true, cor: true, icone: true } },
  categoria: { select: { id: true, nome: true, cor: true, icone: true, categoriaPaiId: true } },
  etiquetas: { include: { etiqueta: { select: { id: true, nome: true, cor: true } } } },
  usuario: { select: { id: true, nome: true, perfil: { select: { fotoUrl: true } } } },
  _count: { select: { anexos: true } },
} satisfies Prisma.MovimentacaoInclude;

export type MovimentacaoCompleta = Prisma.MovimentacaoGetPayload<{
  include: typeof INCLUDE_COMPLETO;
}>;

export interface DadosCriarMovimentacao {
  usuarioId: string;
  contaId: string;
  categoriaId: string;
  tipo: TipoMovimentacao;
  descricao: string;
  observacao: string | null;
  valor: Prisma.Decimal;
  valorPago: Prisma.Decimal;
  situacao: SituacaoMovimentacao;
  dataCompetencia: Date;
  dataVencimento: Date;
  dataEfetivacao: Date | null;
  etiquetaIds: string[];
}

export class MovimentacaoRepositorio {
  /** Nested write do Prisma (`etiquetas: { create: [...] }`) roda como uma
   * unica operacao atomica no banco — nao precisa de `$transaction`
   * explicito para a movimentacao e seus vinculos de etiqueta nascerem
   * juntos ou nao nascerem. */
  async criar(dados: DadosCriarMovimentacao): Promise<MovimentacaoCompleta> {
    return prisma.movimentacao.create({
      data: {
        usuarioId: dados.usuarioId,
        contaId: dados.contaId,
        categoriaId: dados.categoriaId,
        tipo: dados.tipo,
        descricao: dados.descricao,
        observacao: dados.observacao,
        valor: dados.valor,
        valorPago: dados.valorPago,
        situacao: dados.situacao,
        dataCompetencia: dados.dataCompetencia,
        dataVencimento: dados.dataVencimento,
        dataEfetivacao: dados.dataEfetivacao,
        ...(dados.etiquetaIds.length > 0
          ? { etiquetas: { create: dados.etiquetaIds.map((etiquetaId) => ({ etiquetaId })) } }
          : {}),
      },
      include: INCLUDE_COMPLETO,
    });
  }

  async buscarPorId(id: string, usuarioId: string): Promise<MovimentacaoCompleta | null> {
    return prisma.movimentacao.findFirst({
      where: { id, usuarioId, excluidoEm: null },
      include: INCLUDE_COMPLETO,
    });
  }
}
