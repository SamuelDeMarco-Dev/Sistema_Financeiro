import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as categoriaServico from '@/funcionalidades/categorias/servicos/categoria.servico';
import type { Categoria } from '@/funcionalidades/categorias/tipos/categoria';
import { Categorias } from './Categorias';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/categorias/servicos/categoria.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Categorias', () => {
  it('mostra o estado de carregando enquanto a requisicao esta em andamento', () => {
    vi.mocked(categoriaServico.listarCategorias).mockReturnValue(new Promise(() => undefined));

    render(<Categorias />, { wrapper: Wrapper });

    expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('mostra o estado de erro com opcao de tentar novamente', async () => {
    vi.mocked(categoriaServico.listarCategorias).mockRejectedValue(new Error('falhou'));

    render(<Categorias />, { wrapper: Wrapper });

    expect(await screen.findByText('Não foi possível carregar suas categorias.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });

  it('mostra a aba Despesas por padrao e a arvore correspondente', async () => {
    vi.mocked(categoriaServico.listarCategorias).mockResolvedValue([
      fabricarCategoria({ id: 'despesa-1', nome: 'Alimentação', tipo: 'DESPESA' }),
      fabricarCategoria({ id: 'receita-1', nome: 'Salário', tipo: 'RECEITA' }),
    ]);

    render(<Categorias />, { wrapper: Wrapper });

    expect(await screen.findByText('Alimentação')).toBeTruthy();
    expect(screen.queryByText('Salário')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Despesas' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('categorias do tipo AMBOS aparecem nas duas abas', async () => {
    vi.mocked(categoriaServico.listarCategorias).mockResolvedValue([
      fabricarCategoria({ id: 'ambos-1', nome: 'Transferência', tipo: 'AMBOS' }),
    ]);

    render(<Categorias />, { wrapper: Wrapper });

    expect(await screen.findByText('Transferência')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Receitas' }));

    expect(await screen.findByText('Transferência')).toBeTruthy();
  });

  it('troca de aba ao clicar', async () => {
    vi.mocked(categoriaServico.listarCategorias).mockResolvedValue([
      fabricarCategoria({ id: 'despesa-1', nome: 'Alimentação', tipo: 'DESPESA' }),
      fabricarCategoria({ id: 'receita-1', nome: 'Salário', tipo: 'RECEITA' }),
    ]);

    render(<Categorias />, { wrapper: Wrapper });

    await screen.findByText('Alimentação');
    fireEvent.click(screen.getByRole('tab', { name: 'Receitas' }));

    expect(await screen.findByText('Salário')).toBeTruthy();
    expect(screen.queryByText('Alimentação')).toBeNull();
  });

  it('abre o formulario de criacao ao clicar em Nova categoria', async () => {
    vi.mocked(categoriaServico.listarCategorias).mockResolvedValue([]);

    render(<Categorias />, { wrapper: Wrapper });

    await screen.findByText('Nenhuma categoria neste tipo ainda.');
    fireEvent.click(screen.getByRole('button', { name: 'Nova categoria' }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByLabelText('Nome')).toBeTruthy();
  });
});
