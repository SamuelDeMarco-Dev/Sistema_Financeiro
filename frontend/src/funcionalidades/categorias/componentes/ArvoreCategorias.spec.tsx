import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ArvoreCategorias } from './ArvoreCategorias';
import type { Categoria } from '../tipos/categoria';

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

describe('ArvoreCategorias', () => {
  it('mostra a mensagem de vazio quando nao ha categorias', () => {
    render(
      <ArvoreCategorias
        categorias={[]}
        onEditar={vi.fn()}
        onExcluir={vi.fn()}
        onNovaSubcategoria={vi.fn()}
      />,
    );

    expect(screen.getByText('Nenhuma categoria neste tipo ainda.')).toBeTruthy();
  });

  it('mostra as raizes e esconde subcategorias por padrao', () => {
    const raiz = fabricarCategoria({
      subcategorias: [
        fabricarCategoria({ id: 'sub-1', nome: 'Restaurante', categoriaPaiId: 'categoria-1' }),
      ],
    });
    render(
      <ArvoreCategorias
        categorias={[raiz]}
        onEditar={vi.fn()}
        onExcluir={vi.fn()}
        onNovaSubcategoria={vi.fn()}
      />,
    );

    expect(screen.getByText('Alimentação')).toBeTruthy();
    expect(screen.queryByText('Restaurante')).toBeNull();
  });

  it('expande e recolhe ao clicar no botao de expansao', async () => {
    const usuario = userEvent.setup();
    const raiz = fabricarCategoria({
      subcategorias: [
        fabricarCategoria({ id: 'sub-1', nome: 'Restaurante', categoriaPaiId: 'categoria-1' }),
      ],
    });
    render(
      <ArvoreCategorias
        categorias={[raiz]}
        onEditar={vi.fn()}
        onExcluir={vi.fn()}
        onNovaSubcategoria={vi.fn()}
      />,
    );

    await usuario.click(screen.getByRole('button', { name: 'Expandir Alimentação' }));
    expect(screen.getByText('Restaurante')).toBeTruthy();

    await usuario.click(screen.getByRole('button', { name: 'Recolher Alimentação' }));
    expect(screen.queryByText('Restaurante')).toBeNull();
  });

  it('Enter no treeitem tambem expande/recolhe', async () => {
    const usuario = userEvent.setup();
    const raiz = fabricarCategoria({
      subcategorias: [
        fabricarCategoria({ id: 'sub-1', nome: 'Restaurante', categoriaPaiId: 'categoria-1' }),
      ],
    });
    render(
      <ArvoreCategorias
        categorias={[raiz]}
        onEditar={vi.fn()}
        onExcluir={vi.fn()}
        onNovaSubcategoria={vi.fn()}
      />,
    );

    const item = screen.getByRole('treeitem', { name: /Alimentação/ });
    item.focus();
    await usuario.keyboard('{Enter}');

    expect(screen.getByText('Restaurante')).toBeTruthy();
  });

  it('ArrowDown move o foco para o proximo item visivel', async () => {
    const usuario = userEvent.setup();
    const categorias = [
      fabricarCategoria({ id: 'categoria-1', nome: 'Alimentação' }),
      fabricarCategoria({ id: 'categoria-2', nome: 'Transporte' }),
    ];
    render(
      <ArvoreCategorias
        categorias={categorias}
        onEditar={vi.fn()}
        onExcluir={vi.fn()}
        onNovaSubcategoria={vi.fn()}
      />,
    );

    const primeiro = screen.getByRole('treeitem', { name: /Alimentação/ });
    primeiro.focus();
    await usuario.keyboard('{ArrowDown}');

    expect(document.activeElement).toBe(screen.getByRole('treeitem', { name: /Transporte/ }));
  });

  it('chama onNovaSubcategoria a partir do menu de acoes de uma raiz', async () => {
    const usuario = userEvent.setup();
    const onNovaSubcategoria = vi.fn();
    render(
      <ArvoreCategorias
        categorias={[fabricarCategoria()]}
        onEditar={vi.fn()}
        onExcluir={vi.fn()}
        onNovaSubcategoria={onNovaSubcategoria}
      />,
    );

    await usuario.click(screen.getByRole('button', { name: 'Ações de Alimentação' }));
    await usuario.click(await screen.findByText('Nova subcategoria'));

    expect(onNovaSubcategoria).toHaveBeenCalledTimes(1);
  });
});
