import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import { ProvedorTema } from '@/contextos/ContextoTema';
import * as perfilServico from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import { AbaPreferencias } from './AbaPreferencias';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/perfil/servicos/perfil.servico');
vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
    usuario: null,
    estaAutenticado: false,
    carregando: false,
    entrar: vi.fn(),
    sair: vi.fn(),
    atualizarUsuario: vi.fn(),
  });
  // ProvedorTema chama matchMedia no mount para saber a preferencia do SO —
  // jsdom nao implementa isto por padrao.
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

const PERFIL_FAKE: PerfilCompleto = {
  id: 'usuario-1',
  nome: 'Samuel De Marco',
  email: 'samuel@exemplo.com',
  emailVerificado: true,
  fotoUrl: null,
  moedaPadrao: 'BRL',
  idioma: 'pt-BR',
  tema: 'SISTEMA',
  timezone: 'America/Sao_Paulo',
  formatoData: 'dd/MM/yyyy',
  primeiroDiaSemana: 0,
  notificacoesApp: true,
  notificacoesEmail: true,
  criadoEm: '2026-01-01T00:00:00.000Z',
};

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return (
    <ProvedorTema>
      <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
    </ProvedorTema>
  );
}

function renderizar(perfil: PerfilCompleto = PERFIL_FAKE): void {
  render(<AbaPreferencias perfil={perfil} />, { wrapper: Wrapper });
}

describe('AbaPreferencias', () => {
  it('preenche os campos com os valores atuais do perfil', () => {
    renderizar();
    expect(screen.getByLabelText<HTMLSelectElement>('Fuso horário').value).toBe(
      'America/Sao_Paulo',
    );
    expect(screen.getByLabelText<HTMLSelectElement>('Moeda padrão').value).toBe('BRL');
    expect(screen.getByLabelText<HTMLInputElement>('Notificações no aplicativo').checked).toBe(
      true,
    );
  });

  it('salva as preferencias alteradas', async () => {
    vi.mocked(perfilServico.atualizarPerfil).mockResolvedValue(PERFIL_FAKE);
    renderizar();

    fireEvent.change(screen.getByLabelText('Fuso horário'), {
      target: { value: 'America/New_York' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar preferências' }));

    // React Query v5 chama mutationFn com (variaveis, contexto) — so as
    // variaveis importam aqui.
    await waitFor(() => {
      expect(vi.mocked(perfilServico.atualizarPerfil).mock.calls[0]?.[0]).toMatchObject({
        timezone: 'America/New_York',
      });
    });
  });

  it('aplica o tema imediatamente (ContextoTema) apos salvar com sucesso', async () => {
    vi.mocked(perfilServico.atualizarPerfil).mockResolvedValue(PERFIL_FAKE);
    renderizar();

    fireEvent.change(screen.getByLabelText('Tema'), { target: { value: 'ESCURO' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar preferências' }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
