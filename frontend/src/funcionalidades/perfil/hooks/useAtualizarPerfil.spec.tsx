import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import * as perfilServico from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import { useAtualizarPerfil } from './useAtualizarPerfil';
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

describe('useAtualizarPerfil', () => {
  it('atualiza o cache de "perfil" e sincroniza o usuario da sessao ao ter sucesso', async () => {
    const atualizarUsuario = vi.fn();
    vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
      usuario: null,
      estaAutenticado: false,
      carregando: false,
      entrar: vi.fn(),
      sair: vi.fn(),
      atualizarUsuario,
    });
    const perfilAtualizado = { ...PERFIL_FAKE, nome: 'Samuel M.' };
    vi.mocked(perfilServico.atualizarPerfil).mockResolvedValue(perfilAtualizado);

    const { result } = renderHook(() => useAtualizarPerfil(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ nome: 'Samuel M.' });
    });

    await waitFor(() => {
      expect(clienteConsulta.getQueryData(chavesPerfil.todas)).toEqual(perfilAtualizado);
    });
    expect(atualizarUsuario).toHaveBeenCalledWith({
      nome: 'Samuel M.',
      fotoUrl: null,
      moedaPadrao: 'BRL',
      idioma: 'pt-BR',
      tema: 'SISTEMA',
      timezone: 'America/Sao_Paulo',
    });
  });
});
