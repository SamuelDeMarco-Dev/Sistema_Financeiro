import { api } from '@/servicos/api';
import type { Categoria, TipoCategoria } from '../tipos/categoria';

export interface FiltrosListarCategorias {
  tipo?: TipoCategoria;
  apenasRaiz?: boolean;
}

export interface CriarCategoriaPayload {
  nome: string;
  tipo: TipoCategoria;
  cor: string;
  icone: string;
  categoriaPaiId: string | null;
}

export type AtualizarCategoriaPayload = Partial<
  Pick<CriarCategoriaPayload, 'nome' | 'tipo' | 'cor' | 'icone'>
>;

export async function listarCategorias(
  filtros: FiltrosListarCategorias = {},
): Promise<Categoria[]> {
  const resposta = await api.get<{ data: { categorias: Categoria[] } }>('/categorias', {
    params: filtros,
  });
  return resposta.data.data.categorias;
}

export async function buscarCategoria(id: string): Promise<Categoria> {
  const resposta = await api.get<{ data: { categoria: Categoria } }>(`/categorias/${id}`);
  return resposta.data.data.categoria;
}

export async function criarCategoria(dados: CriarCategoriaPayload): Promise<Categoria> {
  const resposta = await api.post<{ data: { categoria: Categoria } }>('/categorias', dados);
  return resposta.data.data.categoria;
}

export async function atualizarCategoria(
  id: string,
  dados: AtualizarCategoriaPayload,
): Promise<Categoria> {
  const resposta = await api.patch<{ data: { categoria: Categoria } }>(`/categorias/${id}`, dados);
  return resposta.data.data.categoria;
}

export async function excluirCategoria(id: string, recategorizarPara?: string): Promise<void> {
  await api.delete(`/categorias/${id}`, {
    params: recategorizarPara ? { recategorizarPara } : undefined,
  });
}
