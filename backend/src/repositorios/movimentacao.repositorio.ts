import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import { calcularOrdinalOcorrencia, calcularProximaOcorrencia } from '@/utilitarios/data';
import type { FrequenciaRecorrencia, SituacaoMovimentacao, TipoMovimentacao } from '@prisma/client';

const INCLUDE_COMPLETO = {
  conta: { select: { id: true, nome: true, cor: true, icone: true } },
  categoria: { select: { id: true, nome: true, cor: true, icone: true, categoriaPaiId: true } },
  etiquetas: { include: { etiqueta: { select: { id: true, nome: true, cor: true } } } },
  usuario: { select: { id: true, nome: true, perfil: { select: { fotoUrl: true } } } },
  modeloRecorrencia: {
    select: {
      id: true,
      dataCompetencia: true,
      frequencia: true,
      intervaloRecorrencia: true,
      recorrenciaFimEm: true,
    },
  },
  anexos: {
    select: { id: true, nomeOriginal: true, tipoMime: true, tamanhoBytes: true, criadoEm: true },
    orderBy: { criadoEm: 'asc' },
  },
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

export interface DadosAtualizarMovimentacao {
  tipo?: TipoMovimentacao;
  descricao?: string;
  observacao?: string | null;
  valor?: Prisma.Decimal;
  valorPago?: Prisma.Decimal;
  dataCompetencia?: Date;
  dataVencimento?: Date;
  categoriaId?: string;
  etiquetaIds?: string[];
}

export interface DadosAtualizarPagamento {
  situacao: SituacaoMovimentacao;
  valorPago: Prisma.Decimal;
  dataEfetivacao: Date | null;
}

export interface DadosCriarRecorrencia {
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
  frequencia: FrequenciaRecorrencia;
  intervalo: number;
  fimEm: Date | null;
  totalOcorrencias: number | null;
}

export interface ResultadoCriarRecorrencia {
  primeiraOcorrencia: MovimentacaoCompleta;
  modeloId: string;
  ocorrenciasGeradas: number;
  proximaGeracaoEm: Date;
}

export interface DadosPropagarEdicao {
  descricao?: string;
  observacao?: string | null;
  valor?: Prisma.Decimal;
  categoriaId?: string;
}

export interface ModeloRecorrencia {
  id: string;
  descricao: string;
  valor: Prisma.Decimal;
  frequencia: FrequenciaRecorrencia;
  intervalo: number;
}

export interface OcorrenciaRecorrencia {
  id: string;
  dataCompetencia: Date;
  valor: Prisma.Decimal;
  situacao: SituacaoMovimentacao;
  divergeDoModelo: boolean;
}

export interface ContraparteTransferencia {
  movimentacaoId: string;
  conta: { id: string; nome: string };
}

const SITUACOES_EFETIVADAS: SituacaoMovimentacao[] = ['PAGA', 'PAGA_PARCIALMENTE'];

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

/** RN-18: gera no maximo 12 datas (a ancora + ate 11 seguintes), sempre a
 * partir da ancora (nunca encadeando) — ver comentario de
 * `calcularProximaOcorrencia`. Interrompe antes de 12 se `totalOcorrencias`
 * ou `fimEm` (o que vier primeiro) ja tiver sido atingido; o reabastecimento
 * para alem de 12 meses e responsabilidade da tarefa diaria (issue #41). */
function gerarDatasOcorrencias(
  ancora: Date,
  frequencia: FrequenciaRecorrencia,
  intervalo: number,
  fimEm: Date | null,
  totalOcorrencias: number | null,
): Date[] {
  const datas: Date[] = [ancora];
  const limite = Math.min(12, totalOcorrencias ?? 12);
  for (let indice = 1; indice < limite; indice += 1) {
    const proxima = calcularProximaOcorrencia(ancora, frequencia, intervalo * indice);
    if (fimEm !== null && proxima > fimEm) break;
    datas.push(proxima);
  }
  return datas;
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

  /** `etiquetaIds` undefined = nao tocar nos vinculos; array (mesmo vazio)
   * = substituir a lista inteira. `deleteMany` + `create` na mesma escrita
   * aninhada roda como uma unica operacao atomica, igual `criar`. */
  async atualizar(id: string, dados: DadosAtualizarMovimentacao): Promise<MovimentacaoCompleta> {
    return prisma.movimentacao.update({
      where: { id },
      data: {
        ...(dados.tipo !== undefined && { tipo: dados.tipo }),
        ...(dados.descricao !== undefined && { descricao: dados.descricao }),
        ...(dados.observacao !== undefined && { observacao: dados.observacao }),
        ...(dados.valor !== undefined && { valor: dados.valor }),
        ...(dados.valorPago !== undefined && { valorPago: dados.valorPago }),
        ...(dados.dataCompetencia !== undefined && { dataCompetencia: dados.dataCompetencia }),
        ...(dados.dataVencimento !== undefined && { dataVencimento: dados.dataVencimento }),
        ...(dados.categoriaId !== undefined && { categoriaId: dados.categoriaId }),
        ...(dados.etiquetaIds !== undefined && {
          etiquetas: {
            deleteMany: {},
            create: dados.etiquetaIds.map((etiquetaId) => ({ etiquetaId })),
          },
        }),
      },
      include: INCLUDE_COMPLETO,
    });
  }

  async excluirLogicamente(id: string): Promise<void> {
    await prisma.movimentacao.update({ where: { id }, data: { excluidoEm: new Date() } });
  }

  /** Usado tanto por `pagar` (situacao PAGA/PAGA_PARCIALMENTE) quanto por
   * `estornar` (situacao PENDENTE, valorPago zerado, dataEfetivacao nula) —
   * as duas sao a mesma escrita de 3 campos, so o destino muda. */
  async atualizarPagamento(
    id: string,
    dados: DadosAtualizarPagamento,
  ): Promise<MovimentacaoCompleta> {
    return prisma.movimentacao.update({
      where: { id },
      data: {
        situacao: dados.situacao,
        valorPago: dados.valorPago,
        dataEfetivacao: dados.dataEfetivacao,
      },
      include: INCLUDE_COMPLETO,
    });
  }

  /** RN-17/ADR-006: cria o registro-mae (`ehModeloRecorrencia: true`,
   * sempre PENDENTE/sem pagamento — ele nunca aparece em listagem nem
   * afeta saldo) e as ocorrencias concretas vinculadas a ele, tudo em uma
   * transacao. So a primeira ocorrencia (na data informada) carrega a
   * `situacao`/`valorPago`/`dataEfetivacao` recebidas; as demais nascem
   * `PENDENTE` — nao faz sentido uma ocorrencia futura nascer paga. */
  async criarComRecorrencia(dados: DadosCriarRecorrencia): Promise<ResultadoCriarRecorrencia> {
    const [primeiraData, ...datasRestantes] = gerarDatasOcorrencias(
      dados.dataCompetencia,
      dados.frequencia,
      dados.intervalo,
      dados.fimEm,
      dados.totalOcorrencias,
    );
    if (primeiraData === undefined) {
      // gerarDatasOcorrencias sempre inclui ao menos a ancora — rede de
      // seguranca contra uma regressao futura, nunca deveria disparar.
      throw new Error('gerarDatasOcorrencias nao gerou nenhuma data.');
    }
    const deltaVencimentoMs = dados.dataVencimento.getTime() - dados.dataCompetencia.getTime();

    const criarOcorrencia = (
      tx: Prisma.TransactionClient,
      modeloId: string,
      dataCompetenciaOcorrencia: Date,
      ehPrimeira: boolean,
    ): Promise<MovimentacaoCompleta> =>
      tx.movimentacao.create({
        data: {
          usuarioId: dados.usuarioId,
          contaId: dados.contaId,
          categoriaId: dados.categoriaId,
          tipo: dados.tipo,
          descricao: dados.descricao,
          observacao: dados.observacao,
          valor: dados.valor,
          valorPago: ehPrimeira ? dados.valorPago : new Prisma.Decimal(0),
          situacao: ehPrimeira ? dados.situacao : 'PENDENTE',
          dataCompetencia: dataCompetenciaOcorrencia,
          dataVencimento: new Date(dataCompetenciaOcorrencia.getTime() + deltaVencimentoMs),
          dataEfetivacao: ehPrimeira ? dados.dataEfetivacao : null,
          recorrenciaId: modeloId,
          ...(dados.etiquetaIds.length > 0
            ? { etiquetas: { create: dados.etiquetaIds.map((etiquetaId) => ({ etiquetaId })) } }
            : {}),
        },
        include: INCLUDE_COMPLETO,
      });

    return prisma.$transaction(async (tx) => {
      const modelo = await tx.movimentacao.create({
        data: {
          usuarioId: dados.usuarioId,
          contaId: dados.contaId,
          categoriaId: dados.categoriaId,
          tipo: dados.tipo,
          descricao: dados.descricao,
          observacao: dados.observacao,
          valor: dados.valor,
          valorPago: new Prisma.Decimal(0),
          situacao: 'PENDENTE',
          dataCompetencia: dados.dataCompetencia,
          dataVencimento: dados.dataVencimento,
          dataEfetivacao: null,
          ehModeloRecorrencia: true,
          frequencia: dados.frequencia,
          intervaloRecorrencia: dados.intervalo,
          recorrenciaFimEm: dados.fimEm,
          recorrenciaTotal: dados.totalOcorrencias,
        },
      });

      const primeiraOcorrencia = await criarOcorrencia(tx, modelo.id, primeiraData, true);
      for (const dataCompetenciaOcorrencia of datasRestantes) {
        await criarOcorrencia(tx, modelo.id, dataCompetenciaOcorrencia, false);
      }

      const ultimaData = datasRestantes.at(-1) ?? primeiraData;
      return {
        primeiraOcorrencia,
        modeloId: modelo.id,
        ocorrenciasGeradas: 1 + datasRestantes.length,
        proximaGeracaoEm: calcularProximaOcorrencia(ultimaData, dados.frequencia, dados.intervalo),
      };
    });
  }

  /** RN-19: propaga campos "de template" (nunca datas, que sao por
   * ocorrencia) para o modelo e para as ocorrencias no escopo pedido.
   * `dataReferencia` nulo = TODAS; informada = ESTA_E_FUTURAS a partir
   * dela. Ocorrencias ja efetivadas nunca sao tocadas (RN-19). */
  async atualizarEmLote(
    modeloId: string,
    dataReferencia: Date | null,
    dados: DadosPropagarEdicao,
  ): Promise<void> {
    const dadosTemplate: Prisma.MovimentacaoUpdateInput = {
      ...(dados.descricao !== undefined && { descricao: dados.descricao }),
      ...(dados.observacao !== undefined && { observacao: dados.observacao }),
      ...(dados.valor !== undefined && { valor: dados.valor }),
      ...(dados.categoriaId !== undefined && { categoriaId: dados.categoriaId }),
    };

    await prisma.$transaction([
      prisma.movimentacao.update({ where: { id: modeloId }, data: dadosTemplate }),
      prisma.movimentacao.updateMany({
        where: {
          recorrenciaId: modeloId,
          excluidoEm: null,
          situacao: { notIn: SITUACOES_EFETIVADAS },
          ...(dataReferencia !== null && { dataCompetencia: { gte: dataReferencia } }),
        },
        data: dadosTemplate,
      }),
    ]);
  }

  /** RN-20: exclusao logica em cascata. `dataReferencia` nulo exclui o
   * modelo e todas as ocorrencias nao efetivadas (equivalente a excluir
   * "o modelo" ou escopo TODAS); informada, so as ocorrencias a partir
   * dela (ESTA_E_FUTURAS) — e o modelo e "encurtado" (`recorrenciaFimEm`)
   * para a tarefa de reabastecimento (issue #41) parar de gerar mais. */
  /** Retorna os ids efetivamente excluidos — o chamador usa isso para
   * limpar os anexos em disco dessas movimentacoes (a exclusao logica nao
   * dispara o `onDelete: Cascade` do schema, que so vale para DELETE
   * fisico). */
  async excluirRecorrenciaEmCascata(
    modeloId: string,
    dataReferencia: Date | null,
  ): Promise<string[]> {
    const agora = new Date();

    if (dataReferencia === null) {
      const alvos = await prisma.movimentacao.findMany({
        where: {
          OR: [{ id: modeloId }, { recorrenciaId: modeloId }],
          excluidoEm: null,
          situacao: { notIn: SITUACOES_EFETIVADAS },
        },
        select: { id: true },
      });
      const ids = alvos.map((alvo) => alvo.id);
      await prisma.movimentacao.updateMany({
        where: { id: { in: ids } },
        data: { excluidoEm: agora },
      });
      return ids;
    }

    const alvos = await prisma.movimentacao.findMany({
      where: {
        recorrenciaId: modeloId,
        dataCompetencia: { gte: dataReferencia },
        excluidoEm: null,
        situacao: { notIn: SITUACOES_EFETIVADAS },
      },
      select: { id: true },
    });
    const ids = alvos.map((alvo) => alvo.id);
    const dataCorte = new Date(dataReferencia.getTime() - 24 * 60 * 60 * 1000);
    await prisma.$transaction([
      prisma.movimentacao.updateMany({
        where: { id: { in: ids } },
        data: { excluidoEm: agora },
      }),
      prisma.movimentacao.update({
        where: { id: modeloId },
        data: { recorrenciaFimEm: dataCorte, recorrenciaTotal: null },
      }),
    ]);
    return ids;
  }

  /** RN-23: monta, para cada movimentacao TRANSFERENCIA presente num lote
   * (listagem ou item unico), o dado da perna oposta — uma unica consulta
   * agrupada por `transferenciaId`, nunca uma consulta por item (o join
   * entre as duas pernas nao existe como relacao no schema, so
   * `transferenciaId` como correlacao). Chave do mapa e o id da PROPRIA
   * movimentacao (nao o transferenciaId), pronta para lookup em
   * `mapearMovimentacao`. */
  async buscarContrapartes(
    transferenciaIds: string[],
  ): Promise<Map<string, ContraparteTransferencia>> {
    const contrapartePorId = new Map<string, ContraparteTransferencia>();
    if (transferenciaIds.length === 0) return contrapartePorId;

    const pernas = await prisma.movimentacao.findMany({
      where: { transferenciaId: { in: transferenciaIds }, excluidoEm: null },
      select: {
        id: true,
        transferenciaId: true,
        conta: { select: { id: true, nome: true } },
      },
    });

    const porTransferencia = new Map<string, typeof pernas>();
    for (const perna of pernas) {
      if (perna.transferenciaId === null) continue;
      const grupo = porTransferencia.get(perna.transferenciaId);
      if (grupo) grupo.push(perna);
      else porTransferencia.set(perna.transferenciaId, [perna]);
    }

    for (const grupo of porTransferencia.values()) {
      const [primeira, segunda] = grupo;
      if (!primeira || !segunda || !primeira.conta || !segunda.conta) continue;
      contrapartePorId.set(primeira.id, { movimentacaoId: segunda.id, conta: segunda.conta });
      contrapartePorId.set(segunda.id, { movimentacaoId: primeira.id, conta: primeira.conta });
    }

    return contrapartePorId;
  }

  /** 04-API.md §12.8: `id` pode ser o modelo ou qualquer ocorrencia dele —
   * resolve para o modelo antes de listar. */
  async buscarModeloEOcorrencias(
    id: string,
    usuarioId: string,
  ): Promise<{ modelo: ModeloRecorrencia; ocorrencias: OcorrenciaRecorrencia[] } | null> {
    const referencia = await prisma.movimentacao.findFirst({
      where: { id, usuarioId, excluidoEm: null },
      select: { id: true, recorrenciaId: true, ehModeloRecorrencia: true },
    });
    if (!referencia) return null;

    const modeloId = referencia.ehModeloRecorrencia ? referencia.id : referencia.recorrenciaId;
    if (modeloId === null) return null;

    const modelo = await prisma.movimentacao.findFirst({
      where: { id: modeloId, usuarioId, excluidoEm: null, ehModeloRecorrencia: true },
      select: {
        id: true,
        descricao: true,
        valor: true,
        frequencia: true,
        intervaloRecorrencia: true,
      },
    });
    if (!modelo?.frequencia) return null;

    const ocorrencias = await prisma.movimentacao.findMany({
      where: { recorrenciaId: modeloId, usuarioId, excluidoEm: null },
      select: { id: true, dataCompetencia: true, valor: true, situacao: true, descricao: true },
      orderBy: { dataCompetencia: 'asc' },
    });

    return {
      modelo: {
        id: modelo.id,
        descricao: modelo.descricao,
        valor: modelo.valor,
        frequencia: modelo.frequencia,
        intervalo: modelo.intervaloRecorrencia ?? 1,
      },
      ocorrencias: ocorrencias.map((ocorrencia) => ({
        id: ocorrencia.id,
        dataCompetencia: ocorrencia.dataCompetencia,
        valor: ocorrencia.valor,
        situacao: ocorrencia.situacao,
        divergeDoModelo:
          !ocorrencia.valor.equals(modelo.valor) || ocorrencia.descricao !== modelo.descricao,
      })),
    };
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

  /** RF-30 (tarefa `marcar-atrasadas`, issue #41): PENDENTE com vencimento
   * antes de hoje passa a ATRASADA. Nao restringe por `tipo` de proposito —
   * o mesmo criterio do indice parcial `idx_mov_pendentes_vencimento`, que
   * cobre RECEITA e DESPESA igualmente. Idempotente: rodar duas vezes so
   * afeta as que ainda estao PENDENTE na segunda vez (nenhuma, se a
   * primeira rodou por completo). */
  async marcarAtrasadas(hoje: Date): Promise<number> {
    const resultado = await prisma.movimentacao.updateMany({
      where: {
        situacao: 'PENDENTE',
        dataVencimento: { lt: hoje },
        ehModeloRecorrencia: false,
        excluidoEm: null,
      },
      data: { situacao: 'ATRASADA' },
    });
    return resultado.count;
  }

  /** RN-18 (tarefa `gerar-recorrencias`, issue #41): para cada modelo
   * ativo, continua a serie a partir da ultima ocorrencia existente
   * (nunca reconta do zero — por isso nao duplica) at ate `limiteData`,
   * respeitando `recorrenciaFimEm`/`recorrenciaTotal`. Modelos sem
   * conta/categoria/vencimento (nunca deveria acontecer em uso normal,
   * ver `chk_mov_recorrencia`) sao pulados defensivamente. */
  async gerarOcorrenciasFaltantes(limiteData: Date): Promise<number> {
    const modelos = await prisma.movimentacao.findMany({
      where: { ehModeloRecorrencia: true, excluidoEm: null },
      select: {
        id: true,
        usuarioId: true,
        contaId: true,
        categoriaId: true,
        tipo: true,
        descricao: true,
        observacao: true,
        valor: true,
        dataCompetencia: true,
        dataVencimento: true,
        frequencia: true,
        intervaloRecorrencia: true,
        recorrenciaFimEm: true,
        recorrenciaTotal: true,
      },
    });

    let totalGerado = 0;
    for (const modelo of modelos) {
      if (!modelo.frequencia || !modelo.contaId || !modelo.categoriaId || !modelo.dataVencimento) {
        continue;
      }
      const intervalo = modelo.intervaloRecorrencia ?? 1;

      const [totalExistente, ultimaOcorrencia] = await Promise.all([
        prisma.movimentacao.count({ where: { recorrenciaId: modelo.id, excluidoEm: null } }),
        prisma.movimentacao.findFirst({
          where: { recorrenciaId: modelo.id, excluidoEm: null },
          orderBy: { dataCompetencia: 'desc' },
          select: { dataCompetencia: true },
        }),
      ]);
      if (!ultimaOcorrencia) continue;
      if (modelo.recorrenciaTotal !== null && totalExistente >= modelo.recorrenciaTotal) continue;

      const deltaVencimentoMs = modelo.dataVencimento.getTime() - modelo.dataCompetencia.getTime();
      let existentes = totalExistente;
      let ordinal = calcularOrdinalOcorrencia(
        modelo.dataCompetencia,
        ultimaOcorrencia.dataCompetencia,
        modelo.frequencia,
        intervalo,
      );
      let proximaData = calcularProximaOcorrencia(
        modelo.dataCompetencia,
        modelo.frequencia,
        intervalo * ordinal,
      );

      while (
        proximaData <= limiteData &&
        (modelo.recorrenciaFimEm === null || proximaData <= modelo.recorrenciaFimEm) &&
        (modelo.recorrenciaTotal === null || existentes < modelo.recorrenciaTotal)
      ) {
        await prisma.movimentacao.create({
          data: {
            usuarioId: modelo.usuarioId,
            contaId: modelo.contaId,
            categoriaId: modelo.categoriaId,
            tipo: modelo.tipo,
            descricao: modelo.descricao,
            observacao: modelo.observacao,
            valor: modelo.valor,
            valorPago: new Prisma.Decimal(0),
            situacao: 'PENDENTE',
            dataCompetencia: proximaData,
            dataVencimento: new Date(proximaData.getTime() + deltaVencimentoMs),
            dataEfetivacao: null,
            recorrenciaId: modelo.id,
          },
        });

        totalGerado += 1;
        existentes += 1;
        ordinal += 1;
        proximaData = calcularProximaOcorrencia(
          modelo.dataCompetencia,
          modelo.frequencia,
          intervalo * ordinal,
        );
      }
    }

    return totalGerado;
  }
}
