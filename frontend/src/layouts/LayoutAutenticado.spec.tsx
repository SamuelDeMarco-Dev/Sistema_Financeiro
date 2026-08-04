import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import { LayoutAutenticado } from './LayoutAutenticado';

vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

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

    render(
      <MemoryRouter initialEntries={['/configuracoes']}>
        <Routes>
          <Route element={<LayoutAutenticado />}>
            <Route path="/configuracoes" element={<div>Conteudo da pagina</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Gerenciador de Finanças')).toBeTruthy();
    expect(screen.getByText('Conteudo da pagina')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Configurações' }).length).toBeGreaterThan(0);
  });
});
