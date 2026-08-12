import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import { LayoutAutenticado } from './LayoutAutenticado';

vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

// O distintivo de convites na navegacao (issue #74) consulta a API.
vi.mock('@/funcionalidades/compartilhadas/servicos/convite.servico', () => ({
  listarConvitesRecebidos: vi.fn().mockResolvedValue([]),
}));

describe('LayoutAutenticado', () => {
  it('renderiza cabecalho, navegacao e o conteudo da rota filha (Outlet)', () => {
    vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
      usuario: null,
      estaAutenticado: false,
      carregando: false,
      entrar: vi.fn(),
      sair: vi.fn(),
      atualizarUsuario: vi.fn(),
    });
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={cliente}>
        <MemoryRouter initialEntries={['/configuracoes']}>
          <Routes>
            <Route element={<LayoutAutenticado />}>
              <Route path="/configuracoes" element={<div>Conteudo da pagina</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Gerenciador de Finanças')).toBeTruthy();
    expect(screen.getByText('Conteudo da pagina')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Configurações' }).length).toBeGreaterThan(0);
  });
});
