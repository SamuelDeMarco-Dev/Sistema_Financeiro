import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as autenticacaoServico from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import { FormularioCadastro } from './FormularioCadastro';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/autenticacao/servicos/autenticacao.servico');

beforeEach(() => {
  // Mock a nivel de modulo (nao recriado por teste): sem isto, chamadas de
  // um `it()` ficam no historico do proximo (toHaveBeenCalledTimes/With
  // conta chamadas acumuladas de testes anteriores, nao so deste).
  vi.clearAllMocks();
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function preencherFormularioValido(): void {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Samuel De Marco' } });
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'samuel@exemplo.com' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte@2026' } });
  fireEvent.change(screen.getByLabelText('Confirmar senha'), {
    target: { value: 'SenhaForte@2026' },
  });
}

describe('FormularioCadastro', () => {
  it('tem label associada a cada campo (A11Y-03)', () => {
    render(<FormularioCadastro onSucesso={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByLabelText('Nome')).toBeTruthy();
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();
    expect(screen.getByLabelText('Confirmar senha')).toBeTruthy();
  });

  it('mostra o indicador de forca conforme a senha e digitada', () => {
    render(<FormularioCadastro onSucesso={vi.fn()} />, { wrapper: Wrapper });

    expect(screen.queryByText(/Força da senha/)).toBeNull();
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte@2026' } });
    expect(screen.getByText(/Força da senha/)).toBeTruthy();
  });

  it('rejeita confirmacao de senha diferente sem chamar a API', async () => {
    render(<FormularioCadastro onSucesso={vi.fn()} />, { wrapper: Wrapper });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Samuel De Marco' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'samuel@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte@2026' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: { value: 'Diferente@2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(
      await screen.findByText('A confirmacao de senha nao corresponde a senha informada.'),
    ).toBeTruthy();
    expect(autenticacaoServico.cadastrar).not.toHaveBeenCalled();
  });

  it('submete os dados e chama onSucesso com o e-mail cadastrado', async () => {
    vi.mocked(autenticacaoServico.cadastrar).mockResolvedValue({
      id: 'usuario-1',
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      emailVerificado: false,
      criadoEm: '2026-01-01T00:00:00.000Z',
    });
    const onSucesso = vi.fn();
    render(<FormularioCadastro onSucesso={onSucesso} />, { wrapper: Wrapper });

    preencherFormularioValido();
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => {
      expect(onSucesso).toHaveBeenCalledWith('samuel@exemplo.com');
    });
  });

  it('EMAIL_JA_CADASTRADO mostra a mensagem traduzida inline', async () => {
    vi.mocked(autenticacaoServico.cadastrar).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'EMAIL_JA_CADASTRADO',
      message: 'mensagem crua',
    });
    render(<FormularioCadastro onSucesso={vi.fn()} />, { wrapper: Wrapper });

    preencherFormularioValido();
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Este e-mail ja esta cadastrado.')).toBeTruthy();
  });

  it('desabilita o botao durante o envio (evita disparar duas requisicoes em duplo clique)', async () => {
    let resolverCadastro: (() => void) | undefined;
    vi.mocked(autenticacaoServico.cadastrar).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolverCadastro = () => {
            resolve({
              id: 'usuario-1',
              nome: 'Samuel De Marco',
              email: 'samuel@exemplo.com',
              emailVerificado: false,
              criadoEm: '2026-01-01T00:00:00.000Z',
            });
          };
        }),
    );
    render(<FormularioCadastro onSucesso={vi.fn()} />, { wrapper: Wrapper });

    preencherFormularioValido();
    const botao = screen.getByRole('button', { name: 'Criar conta' });
    fireEvent.click(botao);
    fireEvent.click(botao);

    await waitFor(() => {
      expect(botao).toHaveProperty('disabled', true);
    });
    expect(autenticacaoServico.cadastrar).toHaveBeenCalledTimes(1);

    resolverCadastro?.();
  });
});
