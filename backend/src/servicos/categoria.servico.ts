import { NaoEncontradoErro, RecursoEmUsoErro, RegraNegocioErro } from '@/erros';
import { CategoriaRepositorio } from '@/repositorios/categoria.repositorio';
import type { CategoriaComSubcategorias } from '@/repositorios/categoria.repositorio';
import { mapearCategoria } from '@/utilitarios/mapear-categoria';
import type { CategoriaDTO } from '@/utilitarios/mapear-categoria';
import type {
  AtualizarCategoriaDTO,
  CriarCategoriaDTO,
  ListarCategoriasQuery,
} from '@/validadores/categorias.validador';
import type { Categoria, Prisma } from '@prisma/client';

export class CategoriaServico {
  constructor(private readonly repositorio = new CategoriaRepositorio()) {}

  async copiarPadraoParaUsuario(usuarioId: string, tx: Prisma.TransactionClient): Promise<void> {
    await this.repositorio.copiarPadraoParaUsuario(usuarioId, tx);
  }

  async copiarPadraoParaGrupo(
    contaCompartilhadaId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.repositorio.copiarPadraoParaGrupo(contaCompartilhadaId, tx);
  }

  async listarArvore(
    usuarioId: string,
    filtros: Pick<ListarCategoriasQuery, 'tipo' | 'apenasRaiz'>,
  ): Promise<CategoriaDTO[]> {
    const raizes = await this.repositorio.listarRaizesComSubcategorias(usuarioId, filtros);
    return Promise.all(raizes.map((raiz) => this.paraArvoreDTO(raiz, filtros.apenasRaiz)));
  }

  async buscarPorId(id: string, usuarioId: string): Promise<CategoriaDTO> {
    const categoria = await this.buscarCategoriaOuFalhar(id, usuarioId);
    return this.paraDTO(categoria);
  }

  /** RF-21, RN-10: profundidade maxima 1 e mesmo tipo do pai. */
  async criar(usuarioId: string, dados: CriarCategoriaDTO): Promise<CategoriaDTO> {
    if (dados.categoriaPaiId) {
      const pai = await this.buscarCategoriaOuFalhar(dados.categoriaPaiId, usuarioId);
      if (pai.categoriaPaiId !== null) {
        throw new RegraNegocioErro(
          'Subcategoria de subcategoria nao e permitida (profundidade maxima 1).',
        );
      }
      if (pai.tipo !== dados.tipo) {
        throw new RegraNegocioErro('A subcategoria deve ter o mesmo tipo da categoria pai.');
      }
    }

    const categoria = await this.repositorio.criar(usuarioId, {
      nome: dados.nome,
      tipo: dados.tipo,
      cor: dados.cor,
      icone: dados.icone,
      categoriaPaiId: dados.categoriaPaiId ?? null,
    });

    return this.paraDTO(categoria);
  }

  /** RN-10: `tipo` so pode mudar quando nao ha movimentacoes vinculadas —
   * mudar retroativamente reclassificaria lancamentos existentes. */
  async atualizar(
    id: string,
    usuarioId: string,
    dados: AtualizarCategoriaDTO,
  ): Promise<CategoriaDTO> {
    const categoria = await this.buscarCategoriaOuFalhar(id, usuarioId);

    if (dados.tipo !== undefined && dados.tipo !== categoria.tipo) {
      const quantidade = await this.repositorio.contarMovimentacoes(id);
      if (quantidade > 0) {
        throw new RegraNegocioErro(
          'Nao e possivel alterar o tipo de uma categoria com movimentacoes vinculadas.',
        );
      }
    }

    const atualizada = await this.repositorio.atualizar(id, {
      ...(dados.nome !== undefined && { nome: dados.nome }),
      ...(dados.tipo !== undefined && { tipo: dados.tipo }),
      ...(dados.cor !== undefined && { cor: dados.cor }),
      ...(dados.icone !== undefined && { icone: dados.icone }),
    });

    return this.paraDTO(atualizada);
  }

  /** RF-22: categoria com subcategorias nunca e excluida; categoria em uso
   * exige `recategorizarPara` — sem ele, 409 RECURSO_EM_USO. */
  async excluir(id: string, usuarioId: string, recategorizarPara?: string): Promise<void> {
    await this.buscarCategoriaOuFalhar(id, usuarioId);

    const quantidadeSubcategorias = await this.repositorio.contarSubcategorias(id);
    if (quantidadeSubcategorias > 0) {
      throw new RegraNegocioErro('Categoria com subcategorias nao pode ser excluida.');
    }

    const quantidadeMovimentacoes = await this.repositorio.contarMovimentacoes(id);
    if (quantidadeMovimentacoes > 0) {
      if (!recategorizarPara) {
        throw new RecursoEmUsoErro(
          `Esta categoria possui ${quantidadeMovimentacoes} movimentações e não pode ser excluída sem recategorizar.`,
          undefined,
          { quantidadeMovimentacoes },
        );
      }

      // 404 se o destino nao existe ou nao pertence ao usuario (RN-51).
      await this.buscarCategoriaOuFalhar(recategorizarPara, usuarioId);

      // M3 (issue #32): aqui entra a migracao em lote das movimentacoes
      // para `recategorizarPara`, na mesma transacao da exclusao. Sem
      // Movimentacao ainda, quantidadeMovimentacoes nunca e > 0 nesta
      // Milestone — este ramo fica pronto, mas inerte, até M3.
    }

    await this.repositorio.excluirLogicamente(id);
  }

  private async buscarCategoriaOuFalhar(id: string, usuarioId: string): Promise<Categoria> {
    const categoria = await this.repositorio.buscarPorId(id, usuarioId);
    if (!categoria) {
      throw new NaoEncontradoErro('Categoria nao encontrada.');
    }
    return categoria;
  }

  private async paraDTO(categoria: Categoria): Promise<CategoriaDTO> {
    const quantidadeMovimentacoes = await this.repositorio.contarMovimentacoes(categoria.id);
    return mapearCategoria(categoria, quantidadeMovimentacoes);
  }

  private async paraArvoreDTO(
    raiz: CategoriaComSubcategorias,
    apenasRaiz: boolean,
  ): Promise<CategoriaDTO> {
    const subcategoriasDTO = apenasRaiz
      ? []
      : await Promise.all(raiz.subcategorias.map((sub) => this.paraDTO(sub)));
    const quantidadeMovimentacoes = await this.repositorio.contarMovimentacoes(raiz.id);

    return mapearCategoria(raiz, quantidadeMovimentacoes, subcategoriasDTO);
  }
}
