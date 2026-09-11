import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as autenticacaoServico from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import { useRevogarSessao } from './useRevogarSessao';
import { chavesSessoes } from './useSessoesAtivas';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/autenticacao/servicos/autenticacao.servico');

let clienteConsulta: QueryClient;

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  return <QueryClientProvider client={clienteConsulta}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  clienteConsulta = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
});

describe('useRevogarSessao', () => {
  it('invalida a lista de sessoes ativas apos revogar com sucesso', async () => {
    vi.mocked(autenticacaoServico.revogarSessao).mockResolvedValue(undefined);
    const invalidarSpy = vi.spyOn(clienteConsulta, 'invalidateQueries');

    const { result } = renderHook(() => useRevogarSessao(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('sessao-1');
    });

    // React Query v5 chama mutationFn com (variaveis, contexto) — so as
    // variaveis importam aqui.
    expect(vi.mocked(autenticacaoServico.revogarSessao).mock.calls[0]?.[0]).toBe('sessao-1');
    expect(invalidarSpy).toHaveBeenCalledWith({ queryKey: chavesSessoes.todas });
  });
});
