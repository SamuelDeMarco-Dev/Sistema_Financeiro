import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogoExcluirCategoria } from './DialogoExcluirCategoria';
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

describe('DialogoExcluirCategoria', () => {
  it('confirma a exclusao chamando excluirCategoria sem recategorizarPara', async () => {
    vi.mocked(categoriaServico.excluirCategoria).mockResolvedValue(undefined);
    const aoFechar = vi.fn();
    render(
      <DialogoExcluirCategoria
        categoria={fabricarCategoria()}
        categorias={[]}
        aoFechar={aoFechar}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText(/excluir "Alimentação"/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      const chamada = vi.mocked(categoriaServico.excluirCategoria).mock.calls[0];
      expect(chamada?.[0]).toBe('categoria-1');
      expect(chamada?.[1]).toBeUndefined();
    });
    await waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
  });

  it('422 REGRA_NEGOCIO (tem subcategorias) so permite cancelar', async () => {
    vi.mocked(categoriaServico.excluirCategoria).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'REGRA_NEGOCIO',
      message: 'Esta categoria possui subcategorias e não pode ser excluída.',
    });
    render(
      <DialogoExcluirCategoria
        categoria={fabricarCategoria()}
        categorias={[]}
        aoFechar={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText('Esta categoria possui subcategorias e não pode ser excluída.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Recategorizar e excluir' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it('409 RECURSO_EM_USO oferece escolher o destino antes de recategorizar', async () => {
    const categoria = fabricarCategoria();
    const destino = fabricarCategoria({ id: 'categoria-2', nome: 'Restaurante' });
    vi.mocked(categoriaServico.excluirCategoria).mockRejectedValueOnce({
      name: 'ErroApi',
      codigo: 'RECURSO_EM_USO',
      message: 'Esta categoria possui movimentações vinculadas.',
    });
    vi.mocked(categoriaServico.excluirCategoria).mockResolvedValueOnce(undefined);
    const aoFechar = vi.fn();
    render(
      <DialogoExcluirCategoria
        categoria={categoria}
        categorias={[categoria, destino]}
        aoFechar={aoFechar}
      />,
      { wrapper: Wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    const botaoRecategorizar = await screen.findByRole('button', {
      name: 'Recategorizar e excluir',
    });
    expect(botaoRecategorizar.hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByLabelText('Mover as movimentações para'), {
      target: { value: 'categoria-2' },
    });
    expect(botaoRecategorizar.hasAttribute('disabled')).toBe(false);

    fireEvent.click(botaoRecategorizar);

    await waitFor(() => {
      const chamada = vi.mocked(categoriaServico.excluirCategoria).mock.calls[1];
      expect(chamada?.[0]).toBe('categoria-1');
      expect(chamada?.[1]).toBe('categoria-2');
    });
    await waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
  });

  it('nao renderiza como aberto quando categoria e null', () => {
    render(<DialogoExcluirCategoria categoria={null} categorias={[]} aoFechar={vi.fn()} />, {
      wrapper: Wrapper,
    });

    expect(screen.queryByText('Excluir categoria')).toBeNull();
  });
});
