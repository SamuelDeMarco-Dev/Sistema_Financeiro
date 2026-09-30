import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import { RotaProtegida } from './RotaProtegida';
import type { ReactElement } from 'react';

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

function renderizarComRota(caminhoInicial = '/protegida'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[caminhoInicial]}>
      <Routes>
        <Route element={<RotaProtegida />}>
          <Route path="/protegida" element={<div>Conteudo protegido</div>} />
        </Route>
        <Route path="/entrar" element={<TelaLoginFake />} />
      </Routes>
    </MemoryRouter>,
  );
}

function TelaLoginFake(): ReactElement {
  const localizacao = useLocation() as unknown as { state?: { de?: { pathname: string } } };
  return <div>Login, veio de: {localizacao.state?.de?.pathname ?? 'nada'}</div>;
}

describe('RotaProtegida', () => {
  it('mostra um skeleton (nao o conteudo nem o login) enquanto a sessao carrega', () => {
    mockarSessao({ carregando: true });
    renderizarComRota();

    expect(screen.queryByText('Conteudo protegido')).toBeNull();
    expect(screen.queryByText(/Login, veio de/)).toBeNull();
  });

  it('redireciona para /entrar quando nao ha sessao', () => {
    mockarSessao({ carregando: false, estaAutenticado: false });
    renderizarComRota();

    expect(screen.getByText('Login, veio de: /protegida')).toBeTruthy();
  });

  it('renderiza o conteudo protegido quando autenticado', () => {
    mockarSessao({ carregando: false, estaAutenticado: true });
    renderizarComRota();

    expect(screen.getByText('Conteudo protegido')).toBeTruthy();
  });
});
