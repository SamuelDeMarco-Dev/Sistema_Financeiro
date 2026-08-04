import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as autenticacaoServico from '@/servicos/autenticacao.servico';
import { RedefinirSenha } from './RedefinirSenha';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/servicos/autenticacao.servico');

beforeEach(() => {
  vi.clearAllMocks();
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function renderizarComToken(token: string | null): void {
  const busca = token ? `?token=${token}` : '';
  render(
    <Wrapper>
      <MemoryRouter initialEntries={[`/redefinir-senha${busca}`]}>
        <Routes>
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/entrar" element={<div>Tela de login</div>} />
          <Route path="/esqueci-senha" element={<div>Esqueci minha senha</div>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
}

function preencherSenhasValidas(): void {
  fireEvent.change(screen.getByLabelText('Nova senha'), {
    target: { value: 'NovaSenha@2026' },
  });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
    target: { value: 'NovaSenha@2026' },
  });
}

describe('RedefinirSenha', () => {
  it('sem token na URL, mostra a tela de link invalido com acao de solicitar novo link', () => {
    renderizarComToken(null);

    expect(screen.getByText('Link inválido ou expirado')).toBeTruthy();
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
    expect(screen.getByRole('link', { name: 'Solicitar novo link' })).toBeTruthy();
  });

  it('com token, mostra o formulario com label em cada campo (A11Y-03)', () => {
    renderizarComToken('token-valido');

    expect(screen.getByLabelText('Nova senha')).toBeTruthy();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeTruthy();
  });

  it('mostra o indicador de forca conforme a nova senha e digitada', () => {
    renderizarComToken('token-valido');

    expect(screen.queryByText(/Força da senha/)).toBeNull();
    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'NovaSenha@2026' },
    });
    expect(screen.getByText(/Força da senha/)).toBeTruthy();
  });

  it('rejeita confirmacao diferente sem chamar a API', async () => {
    renderizarComToken('token-valido');

    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'NovaSenha@2026' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'Diferente@2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(
      await screen.findByText('A confirmacao de senha nao corresponde a senha informada.'),
    ).toBeTruthy();
    expect(autenticacaoServico.redefinirSenha).not.toHaveBeenCalled();
  });

  it('submete token+senha e redireciona para /entrar quando bem-sucedido', async () => {
    vi.mocked(autenticacaoServico.redefinirSenha).mockResolvedValue(undefined);
    renderizarComToken('token-valido');

    preencherSenhasValidas();
    fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    await waitFor(() => {
      expect(screen.getByText('Tela de login')).toBeTruthy();
    });
    expect(vi.mocked(autenticacaoServico.redefinirSenha).mock.calls[0]?.[0]).toEqual({
      token: 'token-valido',
      senha: 'NovaSenha@2026',
      confirmacaoSenha: 'NovaSenha@2026',
    });
  });

  it('token invalido/expirado (falha na API) troca para a tela de link invalido', async () => {
    vi.mocked(autenticacaoServico.redefinirSenha).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'VALIDACAO',
      message: 'Token invalido ou expirado.',
    });
    renderizarComToken('token-expirado');

    preencherSenhasValidas();
    fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(await screen.findByText('Link inválido ou expirado')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Solicitar novo link' })).toBeTruthy();
  });

  it('desabilita o botao durante o envio (evita disparar duas requisicoes em duplo clique)', async () => {
    let resolverEnvio: (() => void) | undefined;
    vi.mocked(autenticacaoServico.redefinirSenha).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolverEnvio = resolve;
        }),
    );
    renderizarComToken('token-valido');

    preencherSenhasValidas();
    const botao = screen.getByRole('button', { name: 'Redefinir senha' });
    fireEvent.click(botao);
    fireEvent.click(botao);

    await waitFor(() => {
      expect(botao).toHaveProperty('disabled', true);
    });
    expect(autenticacaoServico.redefinirSenha).toHaveBeenCalledTimes(1);

    resolverEnvio?.();
  });
});
