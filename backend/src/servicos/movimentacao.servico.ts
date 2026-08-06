import { Prisma } from '@prisma/client';
import {
  CategoriaIncompativelErro,
  ContaArquivadaErro,
  ErroInterno,
  NaoEncontradoErro,
  ValidacaoErro,
} from '@/erros';
import { CategoriaRepositorio } from '@/repositorios/categoria.repositorio';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import { EtiquetaRepositorio } from '@/repositorios/etiqueta.repositorio';
import { MovimentacaoRepositorio } from '@/repositorios/movimentacao.repositorio';
import type {
  FiltrosListarMovimentacoes,
  PaginacaoMovimentacoes,
} from '@/repositorios/movimentacao.repositorio';
import { validarCompatibilidadeCategoria } from '@/utilitarios/categoria';
import { deDataIso } from '@/utilitarios/data';
import { mapearMovimentacao } from '@/utilitarios/mapear-movimentacao';
import type { MovimentacaoDTO } from '@/utilitarios/mapear-movimentacao';
import type {
  CriarMovimentacaoDTO,
  ListarMovimentacoesQuery,
} from '@/validadores/movimentacoes.validador';
import type { Categoria, Conta } from '@prisma/client';

export class MovimentacaoServico {
  constructor(
    private readonly repositorio = new MovimentacaoRepositorio(),
    private readonly contaRepositorio = new ContaRepositorio(),
    private readonly categoriaRepositorio = new CategoriaRepositorio(),
    private readonly etiquetaRepositorio = new EtiquetaRepositorio(),
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

  async criar(usuarioId: string, dados: CriarMovimentacaoDTO): Promise<MovimentacaoDTO> {
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

    return mapearMovimentacao(movimentacao);
  }

  async buscarPorId(id: string, usuarioId: string): Promise<MovimentacaoDTO> {
    const movimentacao = await this.repositorio.buscarPorId(id, usuarioId);
    if (!movimentacao) {
      throw new NaoEncontradoErro('Movimentação não encontrada.');
    }
    return mapearMovimentacao(movimentacao);
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
