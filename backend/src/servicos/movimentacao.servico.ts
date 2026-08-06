import { Prisma } from '@prisma/client';
import {
  CategoriaIncompativelErro,
  ContaArquivadaErro,
  ErroInterno,
  NaoEncontradoErro,
  RegraNegocioErro,
  ValidacaoErro,
} from '@/erros';
import { CategoriaRepositorio } from '@/repositorios/categoria.repositorio';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import { EtiquetaRepositorio } from '@/repositorios/etiqueta.repositorio';
import { MovimentacaoRepositorio } from '@/repositorios/movimentacao.repositorio';
import type {
  FiltrosListarMovimentacoes,
  MovimentacaoCompleta,
  PaginacaoMovimentacoes,
} from '@/repositorios/movimentacao.repositorio';
import { PerfilRepositorio } from '@/repositorios/perfil.repositorio';
import { validarCompatibilidadeCategoria } from '@/utilitarios/categoria';
import { deDataIso, hojeNoTimezone, paraDataIso } from '@/utilitarios/data';
import { mapearMovimentacao } from '@/utilitarios/mapear-movimentacao';
import type { MovimentacaoDTO } from '@/utilitarios/mapear-movimentacao';
import { registrador } from '@/utilitarios/registrador';
import type {
  AtualizarMovimentacaoDTO,
  CriarMovimentacaoDTO,
  DuplicarMovimentacaoDTO,
  EscopoRecorrencia,
  ListarMovimentacoesQuery,
  PagarMovimentacaoDTO,
} from '@/validadores/movimentacoes.validador';
import type { Categoria, Conta, FrequenciaRecorrencia, SituacaoMovimentacao } from '@prisma/client';

export interface MetaRecorrencia {
  modeloId: string;
  ocorrenciasGeradas: number;
  proximaGeracaoEm: string;
}

export interface OcorrenciasRecorrenciaDTO {
  modelo: {
    id: string;
    descricao: string;
    valor: string;
    frequencia: FrequenciaRecorrencia;
    intervalo: number;
  };
  ocorrencias: {
    id: string;
    dataCompetencia: string;
    valor: string;
    situacao: SituacaoMovimentacao;
    divergeDoModelo: boolean;
  }[];
}

export class MovimentacaoServico {
  constructor(
    private readonly repositorio = new MovimentacaoRepositorio(),
    private readonly contaRepositorio = new ContaRepositorio(),
    private readonly categoriaRepositorio = new CategoriaRepositorio(),
    private readonly etiquetaRepositorio = new EtiquetaRepositorio(),
    private readonly perfilRepositorio = new PerfilRepositorio(),
  ) {}

  async listar(
    usuarioId: string,
    query: ListarMovimentacoesQuery,
  ): Promise<{
    itens: MovimentacaoDTO[];
    paginacao: {
      pagina: number;
      limite: number;
      total: number;
      totalPaginas: number;
      temProxima: boolean;
      temAnterior: boolean;
    };
    totalizadores: {
      receitas: string;
      despesas: string;
      resultado: string;
      receitasPendentes: string;
      despesasPendentes: string;
    };
  }> {
    const filtros: FiltrosListarMovimentacoes = {
      dataInicio: query.dataInicio ? deDataIso(query.dataInicio) : undefined,
      dataFim: query.dataFim ? deDataIso(query.dataFim) : undefined,
      campoData: query.campoData,
      tipo: query.tipo,
      situacao: query.situacao,
      contaId: query.contaId,
      categoriaId: query.categoriaId,
      etiquetaId: query.etiquetaId,
      cartaoId: query.cartaoId,
      valorMinimo: query.valorMinimo ? new Prisma.Decimal(query.valorMinimo) : undefined,
      valorMaximo: query.valorMaximo ? new Prisma.Decimal(query.valorMaximo) : undefined,
      busca: query.busca,
      apenasRecorrentes: query.apenasRecorrentes,
      apenasParceladas: query.apenasParceladas,
    };
    const paginacao: PaginacaoMovimentacoes = {
      pagina: query.pagina,
      limite: query.limite,
      ordenarPor: query.ordenarPor,
      ordem: query.ordem,
    };

    const where = await this.repositorio.montarWhere(usuarioId, filtros);
    const { itens, total, totalizadores } = await this.repositorio.listarComTotalizadores(
      where,
      paginacao,
    );

    const totalPaginas = Math.max(1, Math.ceil(total / paginacao.limite));

    return {
      itens: itens.map(mapearMovimentacao),
      paginacao: {
        pagina: paginacao.pagina,
        limite: paginacao.limite,
        total,
        totalPaginas,
        temProxima: paginacao.pagina < totalPaginas,
        temAnterior: paginacao.pagina > 1,
      },
      totalizadores: {
        receitas: totalizadores.receitas.toFixed(2),
        despesas: totalizadores.despesas.toFixed(2),
        resultado: totalizadores.resultado.toFixed(2),
        receitasPendentes: totalizadores.receitasPendentes.toFixed(2),
        despesasPendentes: totalizadores.despesasPendentes.toFixed(2),
      },
    };
  }

  async criar(
    usuarioId: string,
    dados: CriarMovimentacaoDTO,
  ): Promise<{ movimentacao: MovimentacaoDTO; recorrencia: MetaRecorrencia | null }> {
    const conta = await this.buscarContaOuFalhar(dados.contaId, usuarioId);
    if (conta.arquivadaEm !== null) {
      throw new ContaArquivadaErro(
        'Esta conta esta arquivada e nao pode receber novos lancamentos.',
        [
          {
            campo: 'contaId',
            mensagem: 'Desarquive a conta antes de lancar uma movimentacao nela.',
          },
        ],
      );
    }

    const categoria = await this.buscarCategoriaOuFalhar(dados.categoriaId, usuarioId);
    if (!validarCompatibilidadeCategoria(categoria, dados.tipo)) {
      throw new CategoriaIncompativelErro(
        'A categoria selecionada não é compatível com o tipo da movimentação.',
        [
          {
            campo: 'categoriaId',
            mensagem: `A categoria "${categoria.nome}" aceita apenas movimentações de ${categoria.tipo}.`,
          },
        ],
      );
    }

    const etiquetaIds = await this.validarEtiquetasOuFalhar(dados.etiquetaIds ?? [], usuarioId);

    const { valorPago, dataEfetivacao } = this.resolverPagamento(dados);

    if (dados.recorrencia) {
      // RF-27/04-API.md §12.2: as duas formas de limitar a recorrencia sao
      // mutuamente exclusivas — 422 REGRA_NEGOCIO (nao 400: o schema por si
      // so aceita as duas, a incompatibilidade e uma regra de negocio).
      if (
        dados.recorrencia.fimEm !== undefined &&
        dados.recorrencia.totalOcorrencias !== undefined
      ) {
        throw new RegraNegocioErro('Informe fimEm ou totalOcorrencias, nunca os dois.', [
          {
            campo: 'recorrencia',
            mensagem: 'fimEm e totalOcorrencias sao mutuamente exclusivos.',
          },
        ]);
      }

      const resultado = await this.repositorio.criarComRecorrencia({
        usuarioId,
        contaId: conta.id,
        categoriaId: categoria.id,
        tipo: dados.tipo,
        descricao: dados.descricao,
        observacao: dados.observacao ?? null,
        valor: new Prisma.Decimal(dados.valor),
        valorPago,
        situacao: dados.situacao,
        dataCompetencia: deDataIso(dados.dataCompetencia),
        dataVencimento: deDataIso(dados.dataVencimento ?? dados.dataCompetencia),
        dataEfetivacao,
        etiquetaIds,
        frequencia: dados.recorrencia.frequencia,
        intervalo: dados.recorrencia.intervalo,
        fimEm: dados.recorrencia.fimEm ? deDataIso(dados.recorrencia.fimEm) : null,
        totalOcorrencias: dados.recorrencia.totalOcorrencias ?? null,
      });

      return {
        movimentacao: mapearMovimentacao(resultado.primeiraOcorrencia),
        recorrencia: {
          modeloId: resultado.modeloId,
          ocorrenciasGeradas: resultado.ocorrenciasGeradas,
          proximaGeracaoEm: paraDataIso(resultado.proximaGeracaoEm),
        },
      };
    }

    const movimentacao = await this.repositorio.criar({
      usuarioId,
      contaId: conta.id,
      categoriaId: categoria.id,
      tipo: dados.tipo,
      descricao: dados.descricao,
      observacao: dados.observacao ?? null,
      valor: new Prisma.Decimal(dados.valor),
      valorPago,
      situacao: dados.situacao,
      dataCompetencia: deDataIso(dados.dataCompetencia),
      dataVencimento: deDataIso(dados.dataVencimento ?? dados.dataCompetencia),
      dataEfetivacao,
      etiquetaIds,
    });

    return { movimentacao: mapearMovimentacao(movimentacao), recorrencia: null };
  }

  async buscarPorId(id: string, usuarioId: string): Promise<MovimentacaoDTO> {
    const movimentacao = await this.buscarMovimentacaoOuFalhar(id, usuarioId);
    return mapearMovimentacao(movimentacao);
  }

  /** RN-15/RF-25: PATCH altera so os campos enviados. Trocar de conta e
   * bloqueado (afetaria o saldo de duas contas — o caminho correto e
   * excluir e recriar); tipo/categoria sao revalidados juntos quando
   * qualquer um dos dois muda. */
  async atualizar(
    id: string,
    usuarioId: string,
    dados: AtualizarMovimentacaoDTO,
  ): Promise<MovimentacaoDTO> {
    const atual = await this.buscarMovimentacaoOuFalhar(id, usuarioId);

    // RN-19: obrigatorio em qualquer movimentacao que pertenca a uma
    // recorrencia — seja uma ocorrencia (recorrenciaId) ou o proprio
    // modelo. Em movimentacao avulsa, escopoEdicao e simplesmente ignorado
    // (04-API.md §12.3).
    const pertenceARecorrencia = atual.recorrenciaId !== null || atual.ehModeloRecorrencia;
    if (pertenceARecorrencia && dados.escopoEdicao === undefined) {
      throw new ValidacaoErro('Informe o escopo da edição para uma movimentação recorrente.', [
        { campo: 'escopoEdicao', mensagem: 'Use APENAS_ESTA, ESTA_E_FUTURAS ou TODAS.' },
      ]);
    }

    if (
      dados.contaId !== undefined ||
      dados.contaCompartilhadaId !== undefined ||
      dados.cartaoId !== undefined
    ) {
      throw new RegraNegocioErro('Não é possível alterar a conta de uma movimentação existente.', [
        {
          campo: 'contaId',
          mensagem:
            'Para mudar de conta, exclua esta movimentação e crie uma nova na conta desejada.',
        },
      ]);
    }

    if (
      atual.tipo === 'TRANSFERENCIA' &&
      (dados.tipo !== undefined || dados.categoriaId !== undefined)
    ) {
      throw new RegraNegocioErro('Transferências não têm tipo nem categoria editáveis por aqui.', [
        { campo: 'categoriaId', mensagem: 'Edite a transferência em /transferencias.' },
      ]);
    }

    const tipoFinal = dados.tipo ?? atual.tipo;
    let categoriaId: string | undefined;
    if (dados.tipo !== undefined || dados.categoriaId !== undefined) {
      const categoriaIdFinal = dados.categoriaId ?? atual.categoria?.id;
      if (categoriaIdFinal === undefined) {
        throw new ValidacaoErro('Informe a categoria.', [
          { campo: 'categoriaId', mensagem: 'Categoria obrigatoria.' },
        ]);
      }
      const categoria = await this.buscarCategoriaOuFalhar(categoriaIdFinal, usuarioId);
      // tipoFinal so pode ser RECEITA/DESPESA aqui — o guard acima ja
      // rejeitou a unica forma de chegar em TRANSFERENCIA (atual.tipo
      // ser transferencia com tipo/categoria sendo alterados).
      if (!validarCompatibilidadeCategoria(categoria, tipoFinal as 'RECEITA' | 'DESPESA')) {
        throw new CategoriaIncompativelErro(
          'A categoria selecionada não é compatível com o tipo da movimentação.',
          [
            {
              campo: 'categoriaId',
              mensagem: `A categoria "${categoria.nome}" aceita apenas movimentações de ${categoria.tipo}.`,
            },
          ],
        );
      }
      categoriaId = categoria.id;
    }

    const etiquetaIds =
      dados.etiquetaIds !== undefined
        ? await this.validarEtiquetasOuFalhar(dados.etiquetaIds, usuarioId)
        : undefined;

    // RN-15: alterar o valor de uma movimentacao ja efetivada exige
    // recalculo de saldo e log de auditoria. `LogAuditoria` (RF-82) chega
    // em M11; por ora o registro fica no log estruturado da aplicacao. O
    // recalculo em si e automatico (calcularSaldoAtual soma valorPago, nunca
    // uma coluna gravada) — mas so se valorPago continuar coerente com o
    // novo valor, daí os ajustes abaixo.
    let valorPagoAjustado: Prisma.Decimal | undefined;
    if (dados.valor !== undefined) {
      const valorNovo = new Prisma.Decimal(dados.valor);
      if (atual.situacao === 'PAGA') {
        // RN-14: PAGA sempre tem valorPago === valor.
        valorPagoAjustado = valorNovo;
      } else if (atual.situacao === 'PAGA_PARCIALMENTE' && valorNovo.lessThan(atual.valorPago)) {
        throw new RegraNegocioErro('O novo valor não pode ser menor que o valor já pago.', [
          { campo: 'valor', mensagem: `Já foram pagos ${atual.valorPago.toFixed(2)}.` },
        ]);
      }

      const efetivada = atual.situacao === 'PAGA' || atual.situacao === 'PAGA_PARCIALMENTE';
      if (efetivada && !valorNovo.equals(atual.valor)) {
        registrador.info(
          {
            movimentacaoId: id,
            usuarioId,
            valorAntigo: atual.valor.toFixed(2),
            valorNovo: dados.valor,
          },
          'RN-15: valor de movimentação já efetivada foi alterado.',
        );
      }
    }

    const movimentacao = await this.repositorio.atualizar(id, {
      ...(dados.tipo !== undefined && { tipo: dados.tipo }),
      ...(dados.descricao !== undefined && { descricao: dados.descricao }),
      ...(dados.observacao !== undefined && { observacao: dados.observacao }),
      ...(dados.valor !== undefined && { valor: new Prisma.Decimal(dados.valor) }),
      ...(valorPagoAjustado !== undefined && { valorPago: valorPagoAjustado }),
      ...(dados.dataCompetencia !== undefined && {
        dataCompetencia: deDataIso(dados.dataCompetencia),
      }),
      ...(dados.dataVencimento !== undefined && {
        dataVencimento: deDataIso(dados.dataVencimento),
      }),
      ...(categoriaId !== undefined && { categoriaId }),
      ...(etiquetaIds !== undefined && { etiquetaIds }),
    });

    // RN-19: ESTA_E_FUTURAS/TODAS propagam para o modelo e para as demais
    // ocorrencias nao efetivadas. Datas (dataCompetencia/dataVencimento) sao
    // sempre por-ocorrencia e nunca propagadas, mesmo nesses escopos — so a
    // ocorrencia atual (ja atualizada acima) reflete uma data enviada.
    if (pertenceARecorrencia && dados.escopoEdicao !== 'APENAS_ESTA') {
      const modeloId = atual.ehModeloRecorrencia ? atual.id : atual.recorrenciaId;
      if (modeloId === null) {
        throw new ErroInterno('Ocorrência de recorrência sem modeloId.');
      }
      await this.repositorio.atualizarEmLote(
        modeloId,
        dados.escopoEdicao === 'ESTA_E_FUTURAS' ? atual.dataCompetencia : null,
        {
          ...(dados.descricao !== undefined && { descricao: dados.descricao }),
          ...(dados.observacao !== undefined && { observacao: dados.observacao }),
          ...(dados.valor !== undefined && { valor: new Prisma.Decimal(dados.valor) }),
          ...(categoriaId !== undefined && { categoriaId }),
        },
      );
    }

    return mapearMovimentacao(movimentacao);
  }

  /** RN-16/RN-20: exclusao logica — a movimentacao para de contar em
   * saldos, totalizadores e listagens. #39 estende isto para excluir o
   * par quando `id` for um dos lados de uma transferencia (RN-39).
   * Excluir pelo id do MODELO sempre significa acabar a serie inteira
   * (nao ha "so esta ocorrencia" quando o alvo e o proprio modelo) —
   * `escopoExclusao` so e obrigatorio/relevante ao excluir uma ocorrencia. */
  async excluir(id: string, usuarioId: string, escopoExclusao?: EscopoRecorrencia): Promise<void> {
    const atual = await this.buscarMovimentacaoOuFalhar(id, usuarioId);

    if (atual.ehModeloRecorrencia) {
      await this.repositorio.excluirRecorrenciaEmCascata(atual.id, null);
      return;
    }

    if (atual.recorrenciaId !== null && escopoExclusao === undefined) {
      throw new ValidacaoErro('Informe o escopo da exclusão para uma ocorrência de recorrência.', [
        { campo: 'escopoExclusao', mensagem: 'Use APENAS_ESTA, ESTA_E_FUTURAS ou TODAS.' },
      ]);
    }

    if (atual.recorrenciaId === null || escopoExclusao === 'APENAS_ESTA') {
      await this.repositorio.excluirLogicamente(id);
      return;
    }

    await this.repositorio.excluirRecorrenciaEmCascata(
      atual.recorrenciaId,
      escopoExclusao === 'ESTA_E_FUTURAS' ? atual.dataCompetencia : null,
    );
  }

  /** RF-26: copia todos os campos, exceto anexos e vinculos de recorrencia/
   * parcelamento (a copia nasce avulsa, sem virar uma nova parcela nem uma
   * nova ocorrencia). `situacao`/`dataCompetencia` podem ser sobrescritas —
   * o caso de uso tipico e duplicar um lancamento pago como um novo
   * pendente no mes seguinte. */
  async duplicar(
    id: string,
    usuarioId: string,
    dados: DuplicarMovimentacaoDTO,
  ): Promise<MovimentacaoDTO> {
    const original = await this.buscarMovimentacaoOuFalhar(id, usuarioId);
    if (original.tipo === 'TRANSFERENCIA') {
      throw new RegraNegocioErro('Transferências não podem ser duplicadas por aqui.', [
        { campo: 'id', mensagem: 'Crie uma nova transferência em /transferencias.' },
      ]);
    }
    if (!original.conta || !original.categoria) {
      throw new ErroInterno('Movimentação original sem conta ou categoria associada.');
    }

    const situacaoFinal = dados.situacao ?? original.situacao;
    const efetivada = situacaoFinal === 'PAGA' || situacaoFinal === 'PAGA_PARCIALMENTE';
    const dataCompetenciaFinal = dados.dataCompetencia
      ? deDataIso(dados.dataCompetencia)
      : original.dataCompetencia;

    const nova = await this.repositorio.criar({
      usuarioId,
      contaId: original.conta.id,
      categoriaId: original.categoria.id,
      tipo: original.tipo,
      descricao: original.descricao,
      observacao: original.observacao,
      valor: original.valor,
      valorPago: efetivada ? original.valorPago : new Prisma.Decimal(0),
      situacao: situacaoFinal,
      dataCompetencia: dataCompetenciaFinal,
      dataVencimento: original.dataVencimento ?? dataCompetenciaFinal,
      dataEfetivacao: efetivada ? original.dataEfetivacao : null,
      etiquetaIds: original.etiquetas.map((vinculo) => vinculo.etiqueta.id),
    });

    return mapearMovimentacao(nova);
  }

  /** RF-29/RF-30: `valorPago` do corpo e um INCREMENTO sobre o ja pago, nao
   * um valor absoluto — pagar 30 de 100 e depois 70 adicionais completa o
   * pagamento (RN-03). Padrao (omitido) e o restante, o que sempre
   * completa para PAGA. */
  async pagar(
    id: string,
    usuarioId: string,
    dados: PagarMovimentacaoDTO,
  ): Promise<MovimentacaoDTO> {
    const atual = await this.buscarMovimentacaoOuFalhar(id, usuarioId);
    this.garantirNaoTransferencia(atual, 'pagas');

    if (atual.situacao === 'PAGA' || atual.situacao === 'CANCELADA') {
      throw new RegraNegocioErro('Esta movimentação não pode ser paga.', [
        {
          campo: 'situacao',
          mensagem: `Situação atual: ${atual.situacao}.`,
        },
      ]);
    }

    const incremento =
      dados.valorPago !== undefined
        ? new Prisma.Decimal(dados.valorPago)
        : atual.valor.minus(atual.valorPago);
    const novoValorPago = atual.valorPago.plus(incremento);

    if (novoValorPago.greaterThan(atual.valor)) {
      throw new RegraNegocioErro('O valor pago não pode exceder o valor total.', [
        {
          campo: 'valorPago',
          mensagem: `O valor restante é ${atual.valor.minus(atual.valorPago).toFixed(2)}.`,
        },
      ]);
    }

    const dataEfetivacao = dados.dataEfetivacao
      ? deDataIso(dados.dataEfetivacao)
      : await this.hojeDoUsuario(usuarioId);

    const movimentacao = await this.repositorio.atualizarPagamento(id, {
      situacao: novoValorPago.equals(atual.valor) ? 'PAGA' : 'PAGA_PARCIALMENTE',
      valorPago: novoValorPago,
      dataEfetivacao,
    });

    return mapearMovimentacao(movimentacao);
  }

  /** RF-31: so reverte o que foi de fato pago — PENDENTE/ATRASADA/CANCELADA
   * nao tem pagamento para estornar. */
  async estornar(id: string, usuarioId: string): Promise<MovimentacaoDTO> {
    const atual = await this.buscarMovimentacaoOuFalhar(id, usuarioId);
    this.garantirNaoTransferencia(atual, 'estornadas');

    if (atual.situacao !== 'PAGA' && atual.situacao !== 'PAGA_PARCIALMENTE') {
      throw new RegraNegocioErro('Esta movimentação não está paga — não há o que estornar.', [
        { campo: 'situacao', mensagem: `Situação atual: ${atual.situacao}.` },
      ]);
    }

    const movimentacao = await this.repositorio.atualizarPagamento(id, {
      situacao: 'PENDENTE',
      valorPago: new Prisma.Decimal(0),
      dataEfetivacao: null,
    });

    return mapearMovimentacao(movimentacao);
  }

  /** 04-API.md §12.8: `id` pode ser o modelo ou qualquer ocorrencia dele. */
  async buscarOcorrencias(id: string, usuarioId: string): Promise<OcorrenciasRecorrenciaDTO> {
    const resultado = await this.repositorio.buscarModeloEOcorrencias(id, usuarioId);
    if (!resultado) {
      throw new NaoEncontradoErro('Movimentação recorrente não encontrada.');
    }

    return {
      modelo: {
        id: resultado.modelo.id,
        descricao: resultado.modelo.descricao,
        valor: resultado.modelo.valor.toFixed(2),
        frequencia: resultado.modelo.frequencia,
        intervalo: resultado.modelo.intervalo,
      },
      ocorrencias: resultado.ocorrencias.map((ocorrencia) => ({
        id: ocorrencia.id,
        dataCompetencia: paraDataIso(ocorrencia.dataCompetencia),
        valor: ocorrencia.valor.toFixed(2),
        situacao: ocorrencia.situacao,
        divergeDoModelo: ocorrencia.divergeDoModelo,
      })),
    };
  }

  private garantirNaoTransferencia(movimentacao: MovimentacaoCompleta, acao: string): void {
    if (movimentacao.tipo === 'TRANSFERENCIA') {
      throw new RegraNegocioErro(`Transferências não podem ser ${acao} por aqui.`, [
        { campo: 'id', mensagem: 'Gerencie o pagamento da transferência em /transferencias.' },
      ]);
    }
  }

  private async hojeDoUsuario(usuarioId: string): Promise<Date> {
    const perfil = await this.perfilRepositorio.buscarPorUsuarioId(usuarioId);
    return hojeNoTimezone(perfil?.timezone ?? 'America/Sao_Paulo');
  }

  /** RN-14: PAGA sempre efetiva o valor total (ignora valorPago enviado —
   * pagamento parcial e um estado proprio, PAGA_PARCIALMENTE); pendente/
   * atrasada/cancelada nunca tem valorPago nem dataEfetivacao. */
  private resolverPagamento(dados: CriarMovimentacaoDTO): {
    valorPago: Prisma.Decimal;
    dataEfetivacao: Date | null;
  } {
    if (dados.situacao === 'PAGA' || dados.situacao === 'PAGA_PARCIALMENTE') {
      if (dados.dataEfetivacao === undefined) {
        // O schema (superRefine) ja garante isto antes de chegar aqui —
        // sobra so como rede de seguranca contra uma regressao futura.
        throw new ErroInterno('Data de efetivacao ausente para movimentacao paga.');
      }
      const dataEfetivacao = deDataIso(dados.dataEfetivacao);

      if (dados.situacao === 'PAGA') {
        return { valorPago: new Prisma.Decimal(dados.valor), dataEfetivacao };
      }
      if (dados.valorPago === undefined) {
        throw new ErroInterno('Valor pago ausente para pagamento parcial.');
      }
      return { valorPago: new Prisma.Decimal(dados.valorPago), dataEfetivacao };
    }
    return { valorPago: new Prisma.Decimal(0), dataEfetivacao: null };
  }

  private async buscarMovimentacaoOuFalhar(
    id: string,
    usuarioId: string,
  ): Promise<MovimentacaoCompleta> {
    const movimentacao = await this.repositorio.buscarPorId(id, usuarioId);
    if (!movimentacao) {
      throw new NaoEncontradoErro('Movimentação não encontrada.');
    }
    return movimentacao;
  }

  /** RN-51: 404 (nunca 403) para conta de outro usuario — o solicitante
   * nao deveria nem saber que ela existe. */
  private async buscarContaOuFalhar(contaId: string, usuarioId: string): Promise<Conta> {
    const conta = await this.contaRepositorio.buscarPorId(contaId, usuarioId);
    if (!conta) {
      throw new NaoEncontradoErro('Conta não encontrada.');
    }
    return conta;
  }

  /** RN-11: aceita categoria do proprio usuario OU categoria padrao do
   * sistema — nunca categoria de outro usuario nem de outro escopo. */
  private async buscarCategoriaOuFalhar(
    categoriaId: string,
    usuarioId: string,
  ): Promise<Categoria> {
    const categoria = await this.categoriaRepositorio.buscarPorIdOuPadrao(categoriaId, usuarioId);
    if (!categoria) {
      throw new NaoEncontradoErro('Categoria não encontrada.');
    }
    return categoria;
  }

  private async validarEtiquetasOuFalhar(
    etiquetaIds: string[],
    usuarioId: string,
  ): Promise<string[]> {
    if (etiquetaIds.length === 0) return [];

    const etiquetas = await this.etiquetaRepositorio.listarPorIds(etiquetaIds, usuarioId);
    if (etiquetas.length !== etiquetaIds.length) {
      throw new ValidacaoErro('Uma ou mais etiquetas não foram encontradas.', [
        {
          campo: 'etiquetaIds',
          mensagem: 'Verifique se todas as etiquetas pertencem à sua conta.',
        },
      ]);
    }
    return etiquetaIds;
  }
}
