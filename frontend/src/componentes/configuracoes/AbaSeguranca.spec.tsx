import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as autenticacaoServico from '@/servicos/autenticacao.servico';
import { AbaSeguranca } from './AbaSeguranca';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/servicos/autenticacao.servico');

beforeEach(() => {
  vi.clearAllMocks();
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function renderizar(): void {
  vi.mocked(autenticacaoServico.listarSessoes).mockResolvedValue([
    {
      id: 'sessao-atual',
      dispositivo: 'Chrome · Windows',
      ip: '189.0.0.1',
      criadoEm: '2026-07-28T09:11:00.000Z',
      expiraEm: '2026-08-04T09:11:00.000Z',
      atual: true,
    },
    {
      id: 'sessao-outra',
      dispositivo: 'Safari · iPhone',
      ip: '189.0.0.2',
      criadoEm: '2026-07-20T09:11:00.000Z',
      expiraEm: '2026-08-04T09:11:00.000Z',
      atual: false,
    },
  ]);
  render(<AbaSeguranca />, { wrapper: Wrapper });
}

describe('AbaSeguranca', () => {
  it('rejeita confirmacao de senha diferente sem chamar a API', async () => {
    renderizar();

    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'SenhaForte@2026' },
    });
    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'OutraSenha@2026' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'Diferente@2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));

    expect(
      await screen.findByText('A confirmacao de senha nao corresponde a senha informada.'),
    ).toBeTruthy();
    expect(autenticacaoServico.alterarSenha).not.toHaveBeenCalled();
  });

  it('altera a senha com dados validos', async () => {
    vi.mocked(autenticacaoServico.alterarSenha).mockResolvedValue(undefined);
    renderizar();

    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'SenhaForte@2026' },
    });
    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'OutraSenha@2026' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'OutraSenha@2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));

    // React Query v5 chama mutationFn com (variaveis, contexto) — so as
    // variaveis importam aqui.
    await waitFor(() => {
      expect(vi.mocked(autenticacaoServico.alterarSenha).mock.calls[0]?.[0]).toEqual({
        senhaAtual: 'SenhaForte@2026',
        senhaNova: 'OutraSenha@2026',
        confirmacaoSenha: 'OutraSenha@2026',
      });
    });
  });

  it('lista as sessoes ativas, marcando a atual e sem botao de revogar nela', async () => {
    renderizar();

    expect(await screen.findByText('Chrome · Windows')).toBeTruthy();
    expect(screen.getByText('Safari · iPhone')).toBeTruthy();
    expect(screen.getByText('Sessão atual')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Revogar' })).toHaveLength(1);
  });

  it('revoga uma sessao que nao e a atual', async () => {
    vi.mocked(autenticacaoServico.revogarSessao).mockResolvedValue(undefined);
    renderizar();

    await screen.findByText('Safari · iPhone');
    fireEvent.click(screen.getByRole('button', { name: 'Revogar' }));

    await waitFor(() => {
      expect(vi.mocked(autenticacaoServico.revogarSessao).mock.calls[0]?.[0]).toBe('sessao-outra');
    });
  });

  it('mostra erro quando falha ao carregar as sessoes ativas', async () => {
    vi.mocked(autenticacaoServico.listarSessoes).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'ERRO_REDE',
      message: 'falhou',
    });
    render(<AbaSeguranca />, { wrapper: Wrapper });

    expect(await screen.findByText('Não foi possível carregar as sessões ativas.')).toBeTruthy();
  });

  it('mostra o erro traduzido quando alterar a senha falha', async () => {
    vi.mocked(autenticacaoServico.alterarSenha).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'VALIDACAO',
      message: 'Senha atual incorreta.',
    });
    renderizar();

    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'SenhaErrada@2026' },
    });
    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'OutraSenha@2026' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'OutraSenha@2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));

    await waitFor(() => {
      expect(autenticacaoServico.alterarSenha).toHaveBeenCalledTimes(1);
    });
  });

  it('mostra o erro traduzido quando revogar uma sessao falha', async () => {
    vi.mocked(autenticacaoServico.revogarSessao).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'ERRO_DESCONHECIDO',
      message: 'falhou',
    });
    renderizar();

    await screen.findByText('Safari · iPhone');
    fireEvent.click(screen.getByRole('button', { name: 'Revogar' }));

    await waitFor(() => {
      expect(autenticacaoServico.revogarSessao).toHaveBeenCalledTimes(1);
    });
  });
});
