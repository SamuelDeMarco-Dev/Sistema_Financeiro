import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormularioCategoria } from './FormularioCategoria';
import * as categoriaServico from '../servicos/categoria.servico';
import type { Categoria } from '../tipos/categoria';
import type { ReactElement, ReactNode } from 'react';

vi.mock('../servicos/categoria.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
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

describe('FormularioCategoria', () => {
  it('modo criacao: envia os dados do formulario para criarCategoria', async () => {
    vi.mocked(categoriaServico.criarCategoria).mockResolvedValue(fabricarCategoria());
    const aoFechar = vi.fn();
    render(
      <FormularioCategoria aberto aoFechar={aoFechar} categorias={[]} tipoPadrao="DESPESA" />,
      { wrapper: Wrapper },
    );

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Academia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar categoria' }));

    await waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
    const chamada = vi.mocked(categoriaServico.criarCategoria).mock.calls[0]?.[0];
    expect(chamada).toMatchObject({ nome: 'Academia', tipo: 'DESPESA' });
  });

  it('modo edicao: preenche os valores atuais e envia atualizarCategoria', async () => {
    const categoria = fabricarCategoria({ nome: 'Nome antigo' });
    vi.mocked(categoriaServico.atualizarCategoria).mockResolvedValue({
      ...categoria,
      nome: 'Nome novo',
    });
    const aoFechar = vi.fn();
    render(
      <FormularioCategoria aberto aoFechar={aoFechar} categorias={[]} categoria={categoria} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByLabelText<HTMLInputElement>('Nome').value).toBe('Nome antigo');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Nome novo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
    const chamada = vi.mocked(categoriaServico.atualizarCategoria).mock.calls[0];
    expect(chamada?.[0]).toBe('categoria-1');
    expect(chamada?.[1]).toMatchObject({ nome: 'Nome novo' });
  });

  it('bloqueia o campo tipo quando a categoria ja tem movimentacoes', () => {
    const categoria = fabricarCategoria({ quantidadeMovimentacoes: 3 });
    render(
      <FormularioCategoria aberto aoFechar={vi.fn()} categorias={[]} categoria={categoria} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByLabelText<HTMLSelectElement>('Tipo').disabled).toBe(true);
    expect(
      screen.getByText(
        'O tipo não pode ser alterado: esta categoria já tem movimentações vinculadas.',
      ),
    ).toBeTruthy();
  });

  it('fluxo nova subcategoria: bloqueia o tipo e nao mostra o seletor de categoria pai', () => {
    const categoriaPai = fabricarCategoria({ id: 'pai-1', nome: 'Moradia', tipo: 'DESPESA' });
    render(
      <FormularioCategoria
        aberto
        aoFechar={vi.fn()}
        categorias={[categoriaPai]}
        categoriaPaiPadrao={categoriaPai}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByLabelText<HTMLSelectElement>('Tipo').disabled).toBe(true);
    expect(screen.getByText('O tipo acompanha a categoria pai (Despesa).')).toBeTruthy();
    expect(screen.queryByText('Categoria pai (opcional)')).toBeNull();
  });

  it('rejeita nome com menos de 2 caracteres sem chamar a API', async () => {
    render(<FormularioCategoria aberto aoFechar={vi.fn()} categorias={[]} />, {
      wrapper: Wrapper,
    });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(await screen.findByText('O nome deve ter no minimo 2 caracteres.')).toBeTruthy();
    expect(categoriaServico.criarCategoria).not.toHaveBeenCalled();
  });

  it('mostra o erro traduzido quando a API falha', async () => {
    vi.mocked(categoriaServico.criarCategoria).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'CONFLITO',
      message: 'Já existe uma categoria com esse nome.',
    });
    render(<FormularioCategoria aberto aoFechar={vi.fn()} categorias={[]} />, {
      wrapper: Wrapper,
    });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Academia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(await screen.findByText('Já existe uma categoria com esse nome.')).toBeTruthy();
  });
});
