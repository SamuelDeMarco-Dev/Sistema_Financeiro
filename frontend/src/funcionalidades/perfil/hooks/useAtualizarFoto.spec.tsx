import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import * as perfilServico from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import { useAtualizarFoto } from './useAtualizarFoto';
import { chavesPerfil } from './usePerfil';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/perfil/servicos/perfil.servico');
vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
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

let clienteConsulta: QueryClient;

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  return <QueryClientProvider client={clienteConsulta}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  clienteConsulta = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
});

describe('useAtualizarFoto', () => {
  it('mescla a nova fotoUrl no cache existente e sincroniza o usuario da sessao', async () => {
    clienteConsulta.setQueryData(chavesPerfil.todas, PERFIL_FAKE);
    const atualizarUsuario = vi.fn();
    vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
      usuario: null,
      estaAutenticado: false,
      carregando: false,
      entrar: vi.fn(),
      sair: vi.fn(),
      atualizarUsuario,
    });
    vi.mocked(perfilServico.atualizarFoto).mockResolvedValue('https://exemplo.com/nova.webp');

    const { result } = renderHook(() => useAtualizarFoto(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(new Blob());
    });

    await waitFor(() => {
      expect(clienteConsulta.getQueryData<PerfilCompleto>(chavesPerfil.todas)?.fotoUrl).toBe(
        'https://exemplo.com/nova.webp',
      );
    });
    // O resto do perfil em cache continua intacto — so fotoUrl muda.
    expect(clienteConsulta.getQueryData<PerfilCompleto>(chavesPerfil.todas)?.nome).toBe(
      'Samuel De Marco',
    );
    expect(atualizarUsuario).toHaveBeenCalledWith({ fotoUrl: 'https://exemplo.com/nova.webp' });
  });

  it('nao quebra quando o cache de perfil ainda nao foi carregado', async () => {
    vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
      usuario: null,
      estaAutenticado: false,
      carregando: false,
      entrar: vi.fn(),
      sair: vi.fn(),
      atualizarUsuario: vi.fn(),
    });
    vi.mocked(perfilServico.atualizarFoto).mockResolvedValue('https://exemplo.com/nova.webp');

    const { result } = renderHook(() => useAtualizarFoto(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(new Blob());
    });

    expect(clienteConsulta.getQueryData(chavesPerfil.todas)).toBeUndefined();
  });
});
