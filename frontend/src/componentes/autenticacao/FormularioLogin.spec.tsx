import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import type { CredenciaisLogin } from '@/servicos/autenticacao.servico';
import { FormularioLogin } from './FormularioLogin';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

type EntrarMock = (credenciais: CredenciaisLogin) => Promise<void>;

function renderizar(entrarFake: EntrarMock) {
  vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
    usuario: null,
    estaAutenticado: false,
    carregando: false,
    entrar: entrarFake,
    sair: vi.fn(),
    atualizarUsuario: vi.fn(),
  });

  const onSucesso = vi.fn();
  const onEmailNaoVerificado = vi.fn();
  render(<FormularioLogin onSucesso={onSucesso} onEmailNaoVerificado={onEmailNaoVerificado} />, {
    wrapper: Wrapper,
  });
  return { onSucesso, onEmailNaoVerificado };
}

describe('FormularioLogin', () => {
  it('tem label associada a cada campo (A11Y-03)', () => {
    renderizar(vi.fn<EntrarMock>());
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();
    expect(screen.getByLabelText('Lembrar-me')).toBeTruthy();
  });

  it('mostra erros de validacao com role=alert ao submeter vazio, sem chamar entrar', async () => {
    const { onSucesso } = renderizar(vi.fn<EntrarMock>());

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    const erros = await screen.findAllByRole('alert');
    expect(erros.length).toBeGreaterThan(0);
    expect(onSucesso).not.toHaveBeenCalled();
  });

  it('submete as credenciais e chama onSucesso quando entrar resolve', async () => {
    const entrarFake = vi.fn<EntrarMock>().mockResolvedValue(undefined);
    const { onSucesso } = renderizar(entrarFake);

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'samuel@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte@2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(onSucesso).toHaveBeenCalledTimes(1);
    });
    expect(entrarFake.mock.calls[0]?.[0]).toMatchObject({
      email: 'samuel@exemplo.com',
      senha: 'SenhaForte@2026',
    });
  });

  it('EMAIL_NAO_VERIFICADO aciona a tela dedicada em vez de um erro generico', async () => {
    const entrarFake = vi.fn<EntrarMock>().mockRejectedValue({
      name: 'ErroApi',
      codigo: 'EMAIL_NAO_VERIFICADO',
      message: 'Confirme seu e-mail antes de entrar.',
    });
    const { onEmailNaoVerificado } = renderizar(entrarFake);

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'nao-verificado@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte@2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(onEmailNaoVerificado).toHaveBeenCalledWith('nao-verificado@exemplo.com');
    });
    expect(screen.queryByText('Confirme seu e-mail antes de entrar.')).toBeNull();
  });

  it('CREDENCIAIS_INVALIDAS mostra a mensagem traduzida inline', async () => {
    const entrarFake = vi.fn<EntrarMock>().mockRejectedValue({
      name: 'ErroApi',
      codigo: 'CREDENCIAIS_INVALIDAS',
      message: 'mensagem crua',
    });
    renderizar(entrarFake);

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'samuel@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaErrada@1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeTruthy();
  });

  it('desabilita o botao durante o envio (evita disparar duas requisicoes em duplo clique)', async () => {
    let resolverEntrar: (() => void) | undefined;
    const entrarFake = vi.fn<EntrarMock>(
      () =>
        new Promise<void>((resolve) => {
          resolverEntrar = resolve;
        }),
    );
    renderizar(entrarFake);

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'samuel@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte@2026' } });

    const botao = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(botao);
    fireEvent.click(botao);

    await waitFor(() => {
      expect(botao).toHaveProperty('disabled', true);
    });
    expect(entrarFake).toHaveBeenCalledTimes(1);

    resolverEntrar?.();
  });
});
