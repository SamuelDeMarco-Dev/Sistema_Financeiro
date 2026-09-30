import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chavesCompartilhadas } from '@/funcionalidades/compartilhadas/hooks/useContasCompartilhadas';
import { useCriarTransferencia } from '@/funcionalidades/transferencias/hooks/useCriarTransferencia';
import * as transferenciaServico from '@/funcionalidades/transferencias/servicos/transferencia.servico';
import type { Transferencia } from '@/funcionalidades/transferencias/tipos/transferencia';
import { useAtualizarMovimentacao } from './useAtualizarMovimentacao';
import { useCriarMovimentacao } from './useCriarMovimentacao';
import { useDuplicarMovimentacao } from './useDuplicarMovimentacao';
import { useEstornarMovimentacao } from './useEstornarMovimentacao';
import { useExcluirMovimentacao } from './useExcluirMovimentacao';
import { usePagarMovimentacao } from './usePagarMovimentacao';
import * as movimentacaoServico from '../servicos/movimentacao.servico';
import type { Movimentacao } from '../tipos/movimentacao';
import type { ReactElement, ReactNode } from 'react';

vi.mock('../servicos/movimentacao.servico');
vi.mock('@/funcionalidades/transferencias/servicos/transferencia.servico');

/** O saldo do grupo e as contas dele vêm do detalhe da conta compartilhada
 * (04-API.md §16.3) — consulta separada da de contas pessoais. Toda mutação
 * que mexe em dinheiro precisa invalidá-la, ou o cabeçalho do grupo fica com
 * saldo velho depois de um lançamento no escopo de grupo (ADR-010; regra 10
 * do CLAUDE.md trata saldo velho como defeito de severidade alta). */
const MOVIMENTACAO = { id: 'mov-1' } as Movimentacao;

function criarCliente(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function envolver(cliente: QueryClient): ({ children }: { children: ReactNode }) => ReactElement {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('mutações de dinheiro invalidam o detalhe do grupo', () => {
  const casos = [
    {
      nome: 'criar',
      preparar: () => {
        vi.mocked(movimentacaoServico.criarMovimentacao).mockResolvedValue(MOVIMENTACAO);
      },
      usar: useCriarMovimentacao,
      variaveis: { descricao: 'Mercado' } as never,
    },
    {
      nome: 'atualizar',
      preparar: () => {
        vi.mocked(movimentacaoServico.atualizarMovimentacao).mockResolvedValue(MOVIMENTACAO);
      },
      usar: useAtualizarMovimentacao,
      variaveis: { id: 'mov-1', dados: {} } as never,
    },
    {
      nome: 'excluir',
      preparar: () => {
        vi.mocked(movimentacaoServico.excluirMovimentacao).mockResolvedValue(undefined);
      },
      usar: useExcluirMovimentacao,
      variaveis: { id: 'mov-1' } as never,
    },
    {
      nome: 'pagar',
      preparar: () => {
        vi.mocked(movimentacaoServico.pagarMovimentacao).mockResolvedValue(MOVIMENTACAO);
      },
      usar: usePagarMovimentacao,
      variaveis: { id: 'mov-1', dados: {} } as never,
    },
    {
      nome: 'estornar',
      preparar: () => {
        vi.mocked(movimentacaoServico.estornarMovimentacao).mockResolvedValue(MOVIMENTACAO);
      },
      usar: useEstornarMovimentacao,
      variaveis: 'mov-1' as never,
    },
    {
      nome: 'duplicar',
      preparar: () => {
        vi.mocked(movimentacaoServico.duplicarMovimentacao).mockResolvedValue(MOVIMENTACAO);
      },
      usar: useDuplicarMovimentacao,
      variaveis: { id: 'mov-1' } as never,
    },
    {
      nome: 'transferir',
      preparar: () => {
        // O valor devolvido nao importa para esta assercao: o que se verifica
        // e a invalidacao no `onSuccess`.
        vi.mocked(transferenciaServico.criarTransferencia).mockResolvedValue({
          id: 'transf-1',
        } as unknown as Transferencia);
      },
      usar: useCriarTransferencia,
      variaveis: { valor: '10.00' } as never,
    },
  ];

  it.each(casos)('$nome invalida chavesCompartilhadas', async ({ preparar, usar, variaveis }) => {
    preparar();
    const cliente = criarCliente();
    const invalidar = vi.spyOn(cliente, 'invalidateQueries');

    const { result } = renderHook(() => usar(), { wrapper: envolver(cliente) });
    result.current.mutate(variaveis);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: chavesCompartilhadas.todas });
  });
});
