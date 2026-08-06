import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { SituacaoMovimentacao, TipoMovimentacao } from '@prisma/client';

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

export interface FiltrosListarMovimentacoes {
  dataInicio?: Date | undefined;
  dataFim?: Date | undefined;
  campoData: 'COMPETENCIA' | 'VENCIMENTO' | 'EFETIVACAO';
  tipo?: TipoMovimentacao[] | undefined;
  situacao?: SituacaoMovimentacao[] | undefined;
  contaId?: string[] | undefined;
  categoriaId?: string[] | undefined;
  etiquetaId?: string[] | undefined;
  cartaoId?: string[] | undefined;
  valorMinimo?: Prisma.Decimal | undefined;
  valorMaximo?: Prisma.Decimal | undefined;
  busca?: string | undefined;
  apenasRecorrentes?: boolean | undefined;
  apenasParceladas?: boolean | undefined;
}

export interface PaginacaoMovimentacoes {
  pagina: number;
  limite: number;
  ordenarPor: 'dataCompetencia' | 'dataVencimento' | 'valor' | 'descricao' | 'criadoEm';
  ordem: 'asc' | 'desc';
}

export interface TotalizadoresMovimentacoes {
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
  resultado: Prisma.Decimal;
  receitasPendentes: Prisma.Decimal;
  despesasPendentes: Prisma.Decimal;
}

const SITUACOES_PENDENTES: SituacaoMovimentacao[] = ['PENDENTE', 'ATRASADA'];

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

  /** RF-34: filtro base sempre presente (excluidoEm/ehModeloRecorrencia) —
   * modelos de recorrencia nunca aparecem na listagem (consulte-os por
   * `/movimentacoes/:id/ocorrencias`, issue #38). */
  async montarWhere(
    usuarioId: string,
    filtros: FiltrosListarMovimentacoes,
  ): Promise<Prisma.MovimentacaoWhereInput> {
    const where: Prisma.MovimentacaoWhereInput = {
      usuarioId,
      excluidoEm: null,
      ehModeloRecorrencia: false,
    };

    if (filtros.tipo) where.tipo = { in: filtros.tipo };
    if (filtros.situacao) where.situacao = { in: filtros.situacao };
    if (filtros.contaId) where.contaId = { in: filtros.contaId };
    if (filtros.categoriaId) {
      where.categoriaId = { in: await this.expandirCategoriaIds(filtros.categoriaId) };
    }
    if (filtros.etiquetaId) {
      where.etiquetas = { some: { etiquetaId: { in: filtros.etiquetaId } } };
    }
    if (filtros.cartaoId) where.cartaoId = { in: filtros.cartaoId };
    if (filtros.apenasRecorrentes !== undefined) {
      where.recorrenciaId = filtros.apenasRecorrentes ? { not: null } : null;
    }
    if (filtros.apenasParceladas !== undefined) {
      where.compraParceladaId = filtros.apenasParceladas ? { not: null } : null;
    }

    if (filtros.dataInicio ?? filtros.dataFim) {
      const filtroData: Prisma.DateTimeFilter<'Movimentacao'> = {};
      if (filtros.dataInicio) filtroData.gte = filtros.dataInicio;
      if (filtros.dataFim) filtroData.lte = filtros.dataFim;
      if (filtros.campoData === 'VENCIMENTO') where.dataVencimento = filtroData;
      else if (filtros.campoData === 'EFETIVACAO') where.dataEfetivacao = filtroData;
      else where.dataCompetencia = filtroData;
    }

    if (filtros.valorMinimo ?? filtros.valorMaximo) {
      const filtroValor: Prisma.DecimalFilter<'Movimentacao'> = {};
      if (filtros.valorMinimo) filtroValor.gte = filtros.valorMinimo;
      if (filtros.valorMaximo) filtroValor.lte = filtros.valorMaximo;
      where.valor = filtroValor;
    }

    if (filtros.busca) {
      where.OR = [
        { descricao: { contains: filtros.busca, mode: 'insensitive' } },
        { observacao: { contains: filtros.busca, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async listarComTotalizadores(
    where: Prisma.MovimentacaoWhereInput,
    paginacao: PaginacaoMovimentacoes,
  ): Promise<{
    itens: MovimentacaoCompleta[];
    total: number;
    totalizadores: TotalizadoresMovimentacoes;
  }> {
    // RN-25: totalizadores excluem transferencias e canceladas, mas
    // respeitam todo o resto do filtro do usuario (AND, nao substituicao).
    const whereTotalizadores: Prisma.MovimentacaoWhereInput = {
      AND: [where, { tipo: { not: 'TRANSFERENCIA' }, situacao: { not: 'CANCELADA' } }],
    };

    const [itens, total, grupos] = await prisma.$transaction([
      prisma.movimentacao.findMany({
        where,
        include: INCLUDE_COMPLETO,
        orderBy: { [paginacao.ordenarPor]: paginacao.ordem },
        skip: (paginacao.pagina - 1) * paginacao.limite,
        take: paginacao.limite,
      }),
      prisma.movimentacao.count({ where }),
      prisma.movimentacao.groupBy({
        by: ['tipo', 'situacao'],
        where: whereTotalizadores,
        orderBy: { tipo: 'asc' },
        _sum: { valor: true },
      }),
    ]);

    let receitas = new Prisma.Decimal(0);
    let despesas = new Prisma.Decimal(0);
    let receitasPendentes = new Prisma.Decimal(0);
    let despesasPendentes = new Prisma.Decimal(0);

    for (const grupo of grupos) {
      const valor = grupo._sum?.valor ?? new Prisma.Decimal(0);
      const pendente = SITUACOES_PENDENTES.includes(grupo.situacao);
      if (grupo.tipo === 'RECEITA') {
        receitas = receitas.plus(valor);
        if (pendente) receitasPendentes = receitasPendentes.plus(valor);
      } else if (grupo.tipo === 'DESPESA') {
        despesas = despesas.plus(valor);
        if (pendente) despesasPendentes = despesasPendentes.plus(valor);
      }
    }

    return {
      itens,
      total,
      totalizadores: {
        receitas,
        despesas,
        resultado: receitas.minus(despesas),
        receitasPendentes,
        despesasPendentes,
      },
    };
  }

  /** RF-34: filtrar por uma categoria-pai inclui automaticamente suas
   * subcategorias — o usuario pensa em "Moradia", nao em "Aluguel +
   * Condominio + IPTU" separadamente. */
  private async expandirCategoriaIds(categoriaIds: string[]): Promise<string[]> {
    const subcategorias = await prisma.categoria.findMany({
      where: { categoriaPaiId: { in: categoriaIds } },
      select: { id: true },
    });
    return [...categoriaIds, ...subcategorias.map((categoria) => categoria.id)];
  }
}
