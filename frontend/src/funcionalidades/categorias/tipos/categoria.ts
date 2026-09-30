export const TIPOS_CATEGORIA = ['RECEITA', 'DESPESA', 'AMBOS'] as const;
export type TipoCategoria = (typeof TIPOS_CATEGORIA)[number];

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  cor: string;
  icone: string;
  categoriaPaiId: string | null;
  ehPadraoSistema: boolean;
  ordem: number;
  quantidadeMovimentacoes: number;
  subcategorias: Categoria[];
}
