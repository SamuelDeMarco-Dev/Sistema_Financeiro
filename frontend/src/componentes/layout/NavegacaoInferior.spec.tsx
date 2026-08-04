import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ITENS_NAVEGACAO } from './itens-navegacao';
import { NavegacaoInferior } from './NavegacaoInferior';

describe('NavegacaoInferior', () => {
  it('renderiza um link para cada item de navegacao', () => {
    render(
      <MemoryRouter>
        <NavegacaoInferior />
      </MemoryRouter>,
    );

    for (const item of ITENS_NAVEGACAO) {
      expect(screen.getByRole('link', { name: item.rotulo })).toBeTruthy();
    }
  });

  it('marca como ativo o link da rota atual', () => {
    const primeiroItem = ITENS_NAVEGACAO[0];
    if (!primeiroItem) throw new Error('nenhum item de navegacao configurado');

    render(
      <MemoryRouter initialEntries={[primeiroItem.para]}>
        <NavegacaoInferior />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: primeiroItem.rotulo });
    expect(link.getAttribute('aria-current')).toBe('page');
  });
});
