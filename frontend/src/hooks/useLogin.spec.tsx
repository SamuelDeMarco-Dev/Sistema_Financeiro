import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import { useLogin } from './useLogin';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

// useLogin e uma fina camada de useMutation sobre ContextoAutenticacao.entrar
// — o teste verifica so a delegacao e o repasse do estado da mutation, nao
// a logica de autenticacao em si (isso ja e' coberto por
// ContextoAutenticacao.spec.tsx).
describe('useLogin', () => {
  it('delega as credenciais para ContextoAutenticacao.entrar e reflete sucesso', async () => {
    const entrarFake = vi.fn().mockResolvedValue(undefined);
    vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
      usuario: null,
      estaAutenticado: false,
      carregando: false,
      entrar: entrarFake,
      sair: vi.fn(),
    });

    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });
    const credenciais = { email: 'samuel@exemplo.com', senha: 'SenhaForte@2026' };

    await act(async () => {
      await result.current.mutateAsync(credenciais);
    });

    // React Query v5 chama mutationFn com (variaveis, contexto) — so as
    // variaveis importam aqui, o contexto e' implementacao interna da lib.
    expect(entrarFake.mock.calls[0]?.[0]).toEqual(credenciais);
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('reflete falha quando ContextoAutenticacao.entrar rejeita (ex.: credenciais invalidas)', async () => {
    const entrarFake = vi.fn().mockRejectedValue(new Error('CREDENCIAIS_INVALIDAS'));
    vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
      usuario: null,
      estaAutenticado: false,
      carregando: false,
      entrar: entrarFake,
      sair: vi.fn(),
    });

    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ email: 'samuel@exemplo.com', senha: 'errada' }),
      ).rejects.toThrow('CREDENCIAIS_INVALIDAS');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
