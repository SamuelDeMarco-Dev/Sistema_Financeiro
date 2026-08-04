import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as autenticacaoServico from '@/servicos/autenticacao.servico';
import { AvisoEmailNaoVerificado } from './AvisoEmailNaoVerificado';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/servicos/autenticacao.servico');

beforeEach(() => {
  vi.clearAllMocks();
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

describe('AvisoEmailNaoVerificado', () => {
  it('mostra o e-mail informado', () => {
    render(<AvisoEmailNaoVerificado email="samuel@exemplo.com" onVoltar={vi.fn()} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByText('samuel@exemplo.com')).toBeTruthy();
  });

  it('reenvia a verificacao e confirma o envio', async () => {
    vi.mocked(autenticacaoServico.reenviarVerificacao).mockResolvedValue(undefined);
    render(<AvisoEmailNaoVerificado email="samuel@exemplo.com" onVoltar={vi.fn()} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }));

    // React Query v5 chama mutationFn com (variaveis, contexto) — so as
    // variaveis importam aqui.
    await waitFor(() => {
      expect(vi.mocked(autenticacaoServico.reenviarVerificacao).mock.calls[0]?.[0]).toBe(
        'samuel@exemplo.com',
      );
    });
    expect(await screen.findByText(/E-mail reenviado/)).toBeTruthy();
  });

  it('chama onVoltar ao clicar em Voltar', () => {
    const onVoltar = vi.fn();
    render(<AvisoEmailNaoVerificado email="samuel@exemplo.com" onVoltar={onVoltar} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(onVoltar).toHaveBeenCalledTimes(1);
  });
});
