import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as contaServico from '@/funcionalidades/contas/servicos/conta.servico';
import type { Conta } from '@/funcionalidades/contas/tipos/conta';
import { Contas } from './Contas';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/contas/servicos/conta.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function fabricarConta(sobrescritas: Partial<Conta> = {}): Conta {
  return {
    id: 'conta-1',
    nome: 'Banco Principal',
    tipo: 'CONTA_CORRENTE',
    instituicao: null,
    saldoInicial: '1000.00',
    saldoAtual: '1000.00',
    saldoPrevisto: '1000.00',
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

describe('Contas', () => {
  it('mostra o estado de carregando enquanto a requisicao esta em andamento', () => {
    vi.mocked(contaServico.listarContas).mockReturnValue(new Promise(() => undefined));

    render(<Contas />, { wrapper: Wrapper });

    expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('mostra o estado de erro com opcao de tentar novamente', async () => {
    vi.mocked(contaServico.listarContas).mockRejectedValue(new Error('falhou'));

    render(<Contas />, { wrapper: Wrapper });

    expect(await screen.findByText('Não foi possível carregar suas contas.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });

  it('mostra o estado vazio quando nao ha contas', async () => {
    vi.mocked(contaServico.listarContas).mockResolvedValue({
      contas: [],
      totalizadores: { saldoTotal: '0.00', quantidadeContas: 0 },
    });

    render(<Contas />, { wrapper: Wrapper });

    expect(await screen.findByText('Nenhuma conta ainda')).toBeTruthy();
  });

  it('mostra o saldo total e as contas quando ha dados', async () => {
    vi.mocked(contaServico.listarContas).mockResolvedValue({
      contas: [fabricarConta()],
      totalizadores: { saldoTotal: '1000.00', quantidadeContas: 1 },
    });

    render(<Contas />, { wrapper: Wrapper });

    expect(await screen.findByText('Banco Principal')).toBeTruthy();
    expect(screen.getByText('Saldo total')).toBeTruthy();
    expect(screen.getByText('1 conta no saldo total')).toBeTruthy();
  });

  it('separa contas ativas de arquivadas em secoes distintas', async () => {
    vi.mocked(contaServico.listarContas).mockResolvedValue({
      contas: [
        fabricarConta({ id: 'ativa-1', nome: 'Ativa' }),
        fabricarConta({ id: 'arquivada-1', nome: 'Arquivada', arquivada: true }),
      ],
      totalizadores: { saldoTotal: '1000.00', quantidadeContas: 1 },
    });

    render(<Contas />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Ativa')).toBeTruthy();
    });
    expect(screen.getByText('Contas arquivadas (1)')).toBeTruthy();
  });
});
