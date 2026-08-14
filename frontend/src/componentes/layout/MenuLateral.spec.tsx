import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ITENS_NAVEGACAO } from './itens-navegacao';
import { MenuLateral } from './MenuLateral';
import type { ReactElement, ReactNode } from 'react';

// O distintivo de convites (issue #74) consulta a API: sem o mock, a
// navegacao dispararia rede de verdade num teste que so olha os links.
vi.mock('@/funcionalidades/compartilhadas/servicos/convite.servico', () => ({
  listarConvitesRecebidos: vi.fn().mockResolvedValue([]),
}));

function Envolver({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

describe('MenuLateral', () => {
  it('renderiza um link para cada item de navegacao', () => {
    render(
      <Envolver>
        <MemoryRouter>
          <MenuLateral />
        </MemoryRouter>
      </Envolver>,
    );

    for (const item of ITENS_NAVEGACAO) {
      expect(screen.getByRole('link', { name: item.rotulo })).toBeTruthy();
    }
  });

  it('marca como ativo o link da rota atual', () => {
    const primeiroItem = ITENS_NAVEGACAO[0];
    if (!primeiroItem) throw new Error('nenhum item de navegacao configurado');

    render(
      <Envolver>
        <MemoryRouter initialEntries={[primeiroItem.para]}>
          <MenuLateral />
        </MemoryRouter>
      </Envolver>,
    );

    const link = screen.getByRole('link', { name: primeiroItem.rotulo });
    expect(link.getAttribute('aria-current')).toBe('page');
  });
});
