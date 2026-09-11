import type { Categoria } from '@prisma/client';

export interface CategoriaDTO {
  id: string;
  nome: string;
  tipo: Categoria['tipo'];
  cor: string;
  icone: string;
  categoriaPaiId: string | null;
  ehPadraoSistema: boolean;
  ordem: number;
  quantidadeMovimentacoes: number;
  subcategorias: CategoriaDTO[];
}

/** 04-API.md §10.1: raiz com `subcategorias` aninhadas. */
export function mapearCategoria(
  categoria: Categoria,
  quantidadeMovimentacoes: number,
  subcategorias: CategoriaDTO[] = [],
): CategoriaDTO {
  return {
    id: categoria.id,
    nome: categoria.nome,
    tipo: categoria.tipo,
    cor: categoria.cor,
    icone: categoria.icone,
    categoriaPaiId: categoria.categoriaPaiId,
    ehPadraoSistema: categoria.ehPadraoSistema,
    ordem: categoria.ordem,
    quantidadeMovimentacoes,
    subcategorias,
  };
}
