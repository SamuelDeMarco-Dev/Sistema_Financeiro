import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as autenticacaoServico from '@/servicos/autenticacao.servico';
import { EsqueciSenha } from './EsqueciSenha';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/servicos/autenticacao.servico');

beforeEach(() => {
  vi.clearAllMocks();
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function renderizar(): void {
  render(
    <Wrapper>
      <MemoryRouter initialEntries={['/esqueci-senha']}>
        <Routes>
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/entrar" element={<div>Tela de login</div>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
}

describe('EsqueciSenha', () => {
  it('tem label associada ao campo de e-mail (A11Y-03)', () => {
    renderizar();
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
  });

  it('mostra confirmacao neutra apos enviar, independente de o e-mail existir', async () => {
    vi.mocked(autenticacaoServico.esqueciSenha).mockResolvedValue(undefined);
    renderizar();

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'qualquer@exemplo.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByText('Verifique seu e-mail')).toBeTruthy();
    expect(screen.getByText('qualquer@exemplo.com')).toBeTruthy();
    expect(vi.mocked(autenticacaoServico.esqueciSenha).mock.calls[0]?.[0]).toBe(
      'qualquer@exemplo.com',
    );
  });

  it('LIMITE_EXCEDIDO mostra a mensagem traduzida inline, sem confirmacao', async () => {
    vi.mocked(autenticacaoServico.esqueciSenha).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'LIMITE_EXCEDIDO',
      message: 'mensagem crua',
    });
    renderizar();

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'samuel@exemplo.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(
      await screen.findByText('Muitas tentativas. Aguarde alguns minutos e tente novamente.'),
    ).toBeTruthy();
    expect(screen.queryByText('Verifique seu e-mail')).toBeNull();
  });

  it('desabilita o botao durante o envio (evita disparar duas requisicoes em duplo clique)', async () => {
    let resolverEnvio: (() => void) | undefined;
    vi.mocked(autenticacaoServico.esqueciSenha).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolverEnvio = resolve;
        }),
    );
    renderizar();

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'samuel@exemplo.com' },
    });
    const botao = screen.getByRole('button', { name: 'Enviar link' });
    fireEvent.click(botao);
    fireEvent.click(botao);

    await waitFor(() => {
      expect(botao).toHaveProperty('disabled', true);
    });
    expect(autenticacaoServico.esqueciSenha).toHaveBeenCalledTimes(1);

    resolverEnvio?.();
  });

  it('tem link para voltar ao login', () => {
    renderizar();
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeTruthy();
  });
});
