import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogoExcluirConta } from './DialogoExcluirConta';
import * as contaServico from '../servicos/conta.servico';
import type { Conta } from '../tipos/conta';
import type { ReactElement, ReactNode } from 'react';

vi.mock('../servicos/conta.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function fabricarConta(sobrescritas: Partial<Conta> = {}): Conta {
  return {
    id: 'conta-1',
    nome: 'Carteira',
    tipo: 'CARTEIRA',
    instituicao: null,
    saldoInicial: '0.00',
    saldoAtual: '0.00',
    saldoPrevisto: '0.00',
    moeda: 'BRL',
    cor: '#2563EB',
    icone: 'wallet',
    incluirNoSaldoTotal: true,
    ordem: 0,
    arquivada: false,
    quantidadeMovimentacoes: 0,
    escopo: { tipo: 'PESSOAL', id: 'usuario-1', nome: 'Samuel De Marco' },
    criadoEm: '2026-01-01T00:00:00.000Z',
    ...sobrescritas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DialogoExcluirConta', () => {
  it('confirma a exclusao chamando excluirConta', async () => {
    vi.mocked(contaServico.excluirConta).mockResolvedValue(undefined);
    const aoFechar = vi.fn();
    render(<DialogoExcluirConta conta={fabricarConta()} aoFechar={aoFechar} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText(/excluir "Carteira"/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      // React Query v5 chama mutationFn com (variaveis, contexto) — so as
      // variaveis importam aqui.
      expect(vi.mocked(contaServico.excluirConta).mock.calls[0]?.[0]).toBe('conta-1');
    });
    await waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
  });

  it('409 RECURSO_EM_USO troca a acao para "Arquivar em vez disso"', async () => {
    vi.mocked(contaServico.excluirConta).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'RECURSO_EM_USO',
      message: 'Esta conta possui 5 movimentações e não pode ser excluída.',
    });
    render(<DialogoExcluirConta conta={fabricarConta()} aoFechar={vi.fn()} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText('Esta conta possui 5 movimentações e não pode ser excluída.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Arquivar em vez disso' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull();
  });

  it('"Arquivar em vez disso" chama arquivarConta e fecha o dialogo', async () => {
    vi.mocked(contaServico.excluirConta).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'RECURSO_EM_USO',
      message: 'Em uso.',
    });
    vi.mocked(contaServico.arquivarConta).mockResolvedValue(fabricarConta({ arquivada: true }));
    const aoFechar = vi.fn();
    render(<DialogoExcluirConta conta={fabricarConta()} aoFechar={aoFechar} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    const botaoArquivar = await screen.findByRole('button', { name: 'Arquivar em vez disso' });
    fireEvent.click(botaoArquivar);

    await waitFor(() => {
      expect(vi.mocked(contaServico.arquivarConta).mock.calls[0]?.[0]).toBe('conta-1');
    });
    await waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
  });

  it('nao renderiza como aberto quando conta e null', () => {
    render(<DialogoExcluirConta conta={null} aoFechar={vi.fn()} />, { wrapper: Wrapper });

    expect(screen.queryByText('Excluir conta')).toBeNull();
  });
});
