import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as autenticacaoServico from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import { useCadastro } from './useCadastro';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/autenticacao/servicos/autenticacao.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

describe('useCadastro', () => {
  it('delega os dados para autenticacaoServico.cadastrar e devolve o usuario criado', async () => {
    const usuarioFake = {
      id: 'usuario-1',
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      emailVerificado: false,
      criadoEm: '2026-01-01T00:00:00.000Z',
    };
    vi.mocked(autenticacaoServico.cadastrar).mockResolvedValue(usuarioFake);

    const { result } = renderHook(() => useCadastro(), { wrapper: Wrapper });
    const dados = {
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      senha: 'SenhaForte@2026',
      confirmacaoSenha: 'SenhaForte@2026',
    };

    await act(async () => {
      await result.current.mutateAsync(dados);
    });

    // React Query v5 chama mutationFn com (variaveis, contexto) — so as
    // variaveis importam aqui, o contexto e' implementacao interna da lib.
    expect(vi.mocked(autenticacaoServico.cadastrar).mock.calls[0]?.[0]).toEqual(dados);
    await waitFor(() => {
      expect(result.current.data).toEqual(usuarioFake);
    });
  });
});
