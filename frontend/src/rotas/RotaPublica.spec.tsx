import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import { RotaPublica } from './RotaPublica';

vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

function mockarSessao(
  sobrescritas: Partial<ReturnType<typeof ContextoAutenticacao.useSessao>>,
): void {
  vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
    usuario: null,
    estaAutenticado: false,
    carregando: false,
    entrar: vi.fn(),
    sair: vi.fn(),
    atualizarUsuario: vi.fn(),
    ...sobrescritas,
  });
}

function renderizarComRota(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/entrar']}>
      <Routes>
        <Route element={<RotaPublica />}>
          <Route path="/entrar" element={<div>Formulario de login</div>} />
        </Route>
        <Route path="/" element={<div>Area logada</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RotaPublica', () => {
  it('mostra um skeleton enquanto a sessao carrega', () => {
    mockarSessao({ carregando: true });
    renderizarComRota();

    expect(screen.queryByText('Formulario de login')).toBeNull();
    expect(screen.queryByText('Area logada')).toBeNull();
  });

  it('renderiza a pagina publica quando nao ha sessao', () => {
    mockarSessao({ carregando: false, estaAutenticado: false });
    renderizarComRota();

    expect(screen.getByText('Formulario de login')).toBeTruthy();
  });

  it('redireciona um usuario ja autenticado para fora da pagina publica', () => {
    mockarSessao({ carregando: false, estaAutenticado: true });
    renderizarComRota();

    expect(screen.getByText('Area logada')).toBeTruthy();
    expect(screen.queryByText('Formulario de login')).toBeNull();
  });
});
