import { prisma } from '@/banco/cliente';
import type { Categoria, Prisma, TipoCategoria } from '@prisma/client';

export interface DadosCriarCategoria {
  nome: string;
  tipo: TipoCategoria;
  cor: string;
  icone: string;
  categoriaPaiId: string | null;
}

export interface FiltrosListarCategorias {
  tipo?: TipoCategoria | undefined;
  apenasRaiz: boolean;
}

export type CategoriaComSubcategorias = Categoria & { subcategorias: Categoria[] };

export class CategoriaRepositorio {
  // `apenasRaiz` decide no servico se as subcategorias (sempre buscadas
  // aqui) entram na resposta — simplifica o tipo de retorno e evita uma
  // segunda forma de include so para omiti-las.
  async listarRaizesComSubcategorias(
    usuarioId: string,
    filtros: FiltrosListarCategorias,
  ): Promise<CategoriaComSubcategorias[]> {
    return prisma.categoria.findMany({
      where: {
        usuarioId,
        excluidoEm: null,
        categoriaPaiId: null,
        ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      },
      include: { subcategorias: { where: { excluidoEm: null }, orderBy: { ordem: 'asc' } } },
      orderBy: { ordem: 'asc' },
    });
  }

  async buscarPorId(id: string, usuarioId: string): Promise<Categoria | null> {
    return prisma.categoria.findFirst({ where: { id, usuarioId, excluidoEm: null } });
  }

  async contarSubcategorias(categoriaPaiId: string): Promise<number> {
    return prisma.categoria.count({ where: { categoriaPaiId, excluidoEm: null } });
  }

  async criar(usuarioId: string, dados: DadosCriarCategoria): Promise<Categoria> {
    return prisma.categoria.create({ data: { usuarioId, ...dados } });
  }

  async atualizar(id: string, dados: Prisma.CategoriaUpdateInput): Promise<Categoria> {
    return prisma.categoria.update({ where: { id }, data: dados });
  }

  async excluirLogicamente(id: string): Promise<void> {
    await prisma.categoria.update({ where: { id }, data: { excluidoEm: new Date() } });
  }

  async contarMovimentacoes(id: string): Promise<number> {
    return prisma.movimentacao.count({ where: { categoriaId: id, excluidoEm: null } });
  }

  /** RN-11: a categoria de uma movimentacao pode ser do proprio usuario ou
   * uma categoria padrao do sistema (usuarioId null, eh_padrao_sistema). */
  async buscarPorIdOuPadrao(id: string, usuarioId: string): Promise<Categoria | null> {
    return prisma.categoria.findFirst({
      where: { id, excluidoEm: null, OR: [{ usuarioId }, { ehPadraoSistema: true }] },
    });
  }

  /** RF-19: copia as categorias padrao do sistema (raiz + subcategorias)
   * para o usuario recem-cadastrado, preservando a hierarquia pai/filho.
   * Roda dentro da transacao de cadastro (issue #11) — falha do cadastro
   * nunca deixa um usuario sem categorias, nem vice-versa. */
  async copiarPadraoParaUsuario(usuarioId: string, tx: Prisma.TransactionClient): Promise<void> {
    const raizes = await tx.categoria.findMany({
      where: { ehPadraoSistema: true, categoriaPaiId: null },
      include: { subcategorias: { where: { ehPadraoSistema: true }, orderBy: { ordem: 'asc' } } },
      orderBy: { ordem: 'asc' },
    });

    for (const raiz of raizes) {
      const novaRaiz = await tx.categoria.create({
        data: {
          usuarioId,
          nome: raiz.nome,
          tipo: raiz.tipo,
          cor: raiz.cor,
          icone: raiz.icone,
          ordem: raiz.ordem,
        },
      });

      if (raiz.subcategorias.length > 0) {
        await tx.categoria.createMany({
          data: raiz.subcategorias.map((sub) => ({
            usuarioId,
            nome: sub.nome,
            tipo: sub.tipo,
            cor: sub.cor,
            icone: sub.icone,
            ordem: sub.ordem,
            categoriaPaiId: novaRaiz.id,
          })),
        });
      }
    }
  }

  /** RF-53 (issue #67): mesma copia de `copiarPadraoParaUsuario`, mas para
   * o escopo do grupo — cada grupo tem sua propria copia editavel,
   * independente da lista global (chk_categoria_escopo exige
   * conta_compartilhada_id XOR usuario_id, nunca a referencia direta a
   * uma categoria com ehPadraoSistema=true fora do proprio catalogo). */
  async copiarPadraoParaGrupo(
    contaCompartilhadaId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const raizes = await tx.categoria.findMany({
      where: { ehPadraoSistema: true, categoriaPaiId: null },
      include: { subcategorias: { where: { ehPadraoSistema: true }, orderBy: { ordem: 'asc' } } },
      orderBy: { ordem: 'asc' },
    });

    for (const raiz of raizes) {
      const novaRaiz = await tx.categoria.create({
        data: {
          contaCompartilhadaId,
          nome: raiz.nome,
          tipo: raiz.tipo,
          cor: raiz.cor,
          icone: raiz.icone,
          ordem: raiz.ordem,
        },
      });

      if (raiz.subcategorias.length > 0) {
        await tx.categoria.createMany({
          data: raiz.subcategorias.map((sub) => ({
            contaCompartilhadaId,
            nome: sub.nome,
            tipo: sub.tipo,
            cor: sub.cor,
            icone: sub.icone,
            ordem: sub.ordem,
            categoriaPaiId: novaRaiz.id,
          })),
        });
      }
    }
  }
}
