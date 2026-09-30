import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelecionadorCategoria } from './SelecionadorCategoria';
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

describe('SelecionadorCategoria', () => {
  it('mostra o placeholder quando nenhuma categoria esta selecionada', () => {
    render(
      <SelecionadorCategoria
        rotulo="Categoria"
        categorias={[fabricarCategoria()]}
        valor=""
        aoAlterar={vi.fn()}
      />,
    );

    expect(screen.getByText('Selecione uma categoria')).toBeTruthy();
  });

  it('mostra a categoria selecionada no gatilho', () => {
    render(
      <SelecionadorCategoria
        rotulo="Categoria"
        categorias={[fabricarCategoria()]}
        valor="categoria-1"
        aoAlterar={vi.fn()}
      />,
    );

    expect(screen.getByText('Alimentação')).toBeTruthy();
  });

  it('lista raizes e subcategorias indentadas ao abrir', async () => {
    const usuario = userEvent.setup();
    const raiz = fabricarCategoria({
      subcategorias: [
        fabricarCategoria({ id: 'sub-1', nome: 'Restaurante', categoriaPaiId: 'categoria-1' }),
      ],
    });
    render(
      <SelecionadorCategoria rotulo="Categoria" categorias={[raiz]} valor="" aoAlterar={vi.fn()} />,
    );

    await usuario.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: /Restaurante/ })).toBeTruthy();
  });

  it('filtra por tipo, incluindo categorias AMBOS', async () => {
    const usuario = userEvent.setup();
    render(
      <SelecionadorCategoria
        rotulo="Categoria"
        categorias={[
          fabricarCategoria({ id: 'despesa-1', nome: 'Alimentação', tipo: 'DESPESA' }),
          fabricarCategoria({ id: 'receita-1', nome: 'Salário', tipo: 'RECEITA' }),
          fabricarCategoria({ id: 'ambos-1', nome: 'Transferência', tipo: 'AMBOS' }),
        ]}
        tipo="DESPESA"
        valor=""
        aoAlterar={vi.fn()}
      />,
    );

    await usuario.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: /Alimentação/ })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Transferência/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Salário/ })).toBeNull();
  });

  it('a busca filtra por nome preservando o pai como contexto', async () => {
    const usuario = userEvent.setup();
    const raiz = fabricarCategoria({
      nome: 'Moradia',
      subcategorias: [
        fabricarCategoria({ id: 'sub-1', nome: 'Aluguel', categoriaPaiId: 'categoria-1' }),
        fabricarCategoria({ id: 'sub-2', nome: 'Condomínio', categoriaPaiId: 'categoria-1' }),
      ],
    });
    render(
      <SelecionadorCategoria rotulo="Categoria" categorias={[raiz]} valor="" aoAlterar={vi.fn()} />,
    );

    await usuario.click(screen.getByRole('combobox'));
    await usuario.type(screen.getByLabelText('Buscar categoria'), 'aluguel');

    expect(screen.getByRole('option', { name: /Moradia/ })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Aluguel/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Condomínio/ })).toBeNull();
  });

  it('mostra "Nenhuma categoria encontrada" quando a busca nao acha nada', async () => {
    const usuario = userEvent.setup();
    render(
      <SelecionadorCategoria
        rotulo="Categoria"
        categorias={[fabricarCategoria()]}
        valor=""
        aoAlterar={vi.fn()}
      />,
    );

    await usuario.click(screen.getByRole('combobox'));
    await usuario.type(screen.getByLabelText('Buscar categoria'), 'xyz-inexistente');

    expect(await screen.findByText('Nenhuma categoria encontrada.')).toBeTruthy();
  });

  it('chama aoAlterar e fecha o popover ao escolher uma opcao', async () => {
    const usuario = userEvent.setup();
    const aoAlterar = vi.fn();
    const raiz = fabricarCategoria({
      subcategorias: [
        fabricarCategoria({ id: 'sub-1', nome: 'Restaurante', categoriaPaiId: 'categoria-1' }),
      ],
    });
    render(
      <SelecionadorCategoria
        rotulo="Categoria"
        categorias={[raiz]}
        valor=""
        aoAlterar={aoAlterar}
      />,
    );

    await usuario.click(screen.getByRole('combobox'));
    await usuario.click(await screen.findByRole('option', { name: /Restaurante/ }));

    expect(aoAlterar).toHaveBeenCalledWith('sub-1');
  });

  it('mostra a mensagem de erro quando informada', () => {
    render(
      <SelecionadorCategoria
        rotulo="Categoria"
        categorias={[]}
        valor=""
        aoAlterar={vi.fn()}
        erro="Selecione uma categoria."
      />,
    );

    expect(screen.getByText('Selecione uma categoria.')).toBeTruthy();
    expect(screen.getByRole('combobox').getAttribute('aria-invalid')).toBe('true');
  });
});
