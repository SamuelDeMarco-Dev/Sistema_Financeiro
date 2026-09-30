import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import { Cabecalho } from './Cabecalho';

vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
});

function mockarSessao(sairFake = vi.fn(), fotoUrl: string | null = null): void {
  vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
    usuario: {
      id: 'usuario-1',
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      perfil: {
        fotoUrl,
        moedaPadrao: 'BRL',
        idioma: 'pt-BR',
        tema: 'SISTEMA',
        timezone: 'America/Sao_Paulo',
      },
    },
    estaAutenticado: true,
    carregando: false,
    entrar: vi.fn(),
    sair: sairFake,
    atualizarUsuario: vi.fn(),
  });
}

function renderizar(): void {
  render(
    <MemoryRouter initialEntries={['/configuracoes']}>
      <Routes>
        <Route path="/configuracoes" element={<Cabecalho />} />
        <Route path="/entrar" element={<div>Tela de login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Cabecalho', () => {
  it('mostra o nome do usuario e as iniciais quando nao ha foto', () => {
    mockarSessao();
    renderizar();

    expect(screen.getByText('Samuel De Marco')).toBeTruthy();
    // Iniciais = primeira letra do primeiro nome + primeira do ultimo — "De"
    // e' nome do meio, entao "Samuel De Marco" vira "SM", nao "SD".
    expect(screen.getByText('SM')).toBeTruthy();
  });

  it('mostra a imagem do avatar quando ha fotoUrl', () => {
    mockarSessao(vi.fn(), 'https://exemplo.com/avatar.webp');
    renderizar();

    // alt="" torna a imagem decorativa (role presentation) — buscar direto
    // no DOM em vez de getByRole('img').
    const avatar = document.querySelector('img');
    expect(avatar?.getAttribute('src')).toBe('https://exemplo.com/avatar.webp');
    expect(screen.queryByText('SM')).toBeNull();
  });

  it('sai e redireciona para /entrar ao clicar em Sair', async () => {
    const sairFake = vi.fn().mockResolvedValue(undefined);
    mockarSessao(sairFake);
    renderizar();

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => {
      expect(sairFake).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Tela de login')).toBeTruthy();
  });
});
