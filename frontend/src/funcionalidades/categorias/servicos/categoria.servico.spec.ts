import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/servicos/api';
import {
  atualizarCategoria,
  criarCategoria,
  excluirCategoria,
  listarCategorias,
} from './categoria.servico';
import type { Categoria } from '../tipos/categoria';

vi.mock('@/servicos/api', () => ({
  api: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

function fabricarCategoria(sobrescritas: Partial<Categoria> = {}): Categoria {
  return {
    id: 'categoria-1',
    nome: 'Alimentação',
    tipo: 'DESPESA',
    cor: '#EA580C',
    icone: 'utensils',
    categoriaPaiId: null,
    ehPadraoSistema: false,
    ordem: 0,
    quantidadeMovimentacoes: 0,
    subcategorias: [],
    ...sobrescritas,
  };
}

describe('categoria.servico', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('listarCategorias() desempacota a arvore', async () => {
    const categoria = fabricarCategoria();
    vi.mocked(api.get).mockResolvedValue({ data: { data: { categorias: [categoria] } } });

    const resultado = await listarCategorias({ tipo: 'DESPESA' });

    expect(api.get).toHaveBeenCalledWith('/categorias', { params: { tipo: 'DESPESA' } });
    expect(resultado).toEqual([categoria]);
  });

  it('criarCategoria() posta o payload', async () => {
    const categoria = fabricarCategoria();
    vi.mocked(api.post).mockResolvedValue({ data: { data: { categoria } } });

    const resultado = await criarCategoria({
      nome: 'Alimentação',
      tipo: 'DESPESA',
      cor: '#EA580C',
      icone: 'utensils',
      categoriaPaiId: null,
    });

    expect(api.post).toHaveBeenCalledWith(
      '/categorias',
      expect.objectContaining({ nome: 'Alimentação' }),
    );
    expect(resultado).toEqual(categoria);
  });

  it('atualizarCategoria() usa PATCH /categorias/:id', async () => {
    const categoria = fabricarCategoria({ nome: 'Novo nome' });
    vi.mocked(api.patch).mockResolvedValue({ data: { data: { categoria } } });

    const resultado = await atualizarCategoria('categoria-1', { nome: 'Novo nome' });

    expect(api.patch).toHaveBeenCalledWith('/categorias/categoria-1', { nome: 'Novo nome' });
    expect(resultado.nome).toBe('Novo nome');
  });

  it('excluirCategoria() sem recategorizarPara nao envia params', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} });

    await excluirCategoria('categoria-1');

    expect(api.delete).toHaveBeenCalledWith('/categorias/categoria-1', { params: undefined });
  });

  it('excluirCategoria() com recategorizarPara envia o destino como query', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} });

    await excluirCategoria('categoria-1', 'categoria-2');

    expect(api.delete).toHaveBeenCalledWith('/categorias/categoria-1', {
      params: { recategorizarPara: 'categoria-2' },
    });
  });
});
