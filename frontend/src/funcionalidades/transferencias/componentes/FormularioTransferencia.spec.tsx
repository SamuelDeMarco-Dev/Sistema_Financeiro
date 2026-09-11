import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as contaServico from '@/funcionalidades/contas/servicos/conta.servico';
import type { Conta } from '@/funcionalidades/contas/tipos/conta';
import * as perfilServico from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import { FormularioTransferencia } from './FormularioTransferencia';
import * as transferenciaServico from '../servicos/transferencia.servico';
import type { Transferencia } from '../tipos/transferencia';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/contas/servicos/conta.servico');
vi.mock('@/funcionalidades/perfil/servicos/perfil.servico');
vi.mock('../servicos/transferencia.servico');

function exigir<T>(valor: T | undefined, mensagem: string): T {
  if (valor === undefined) throw new Error(mensagem);
  return valor;
}

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

function fabricarPerfil(): PerfilCompleto {
  return {
    id: 'usuario-1',
    nome: 'Samuel De Marco',
    email: 'samuel@exemplo.com',
    emailVerificado: true,
    fotoUrl: null,
    moedaPadrao: 'BRL',
    idioma: 'pt-BR',
    tema: 'SISTEMA',
    timezone: 'America/Sao_Paulo',
    formatoData: 'dd/MM/yyyy',
    primeiroDiaSemana: 0,
    notificacoesApp: true,
    notificacoesEmail: true,
    criadoEm: '2026-01-01T00:00:00.000Z',
  };
}

function fabricarTransferencia(): Transferencia {
  return {
    transferenciaId: 'transf-1',
    valor: '100.00',
    data: '2026-08-06',
    descricao: 'Banco Principal → Carteira',
    situacao: 'PAGA',
    saida: {
      movimentacaoId: 'mov-1',
      conta: { id: 'conta-1', nome: 'Banco Principal', saldoAtual: '900.00' },
    },
    entrada: {
      movimentacaoId: 'mov-2',
      conta: { id: 'conta-2', nome: 'Carteira', saldoAtual: '600.00' },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(perfilServico.consultarPerfil).mockResolvedValue(fabricarPerfil());
  vi.mocked(contaServico.listarContas).mockResolvedValue({
    contas: [
      fabricarConta({ id: 'conta-1', nome: 'Banco Principal' }),
      fabricarConta({ id: 'conta-2', nome: 'Carteira' }),
    ],
    totalizadores: { saldoTotal: '1500.00', quantidadeContas: 2 },
  });
});

describe('FormularioTransferencia', () => {
  it('exclui a conta de origem das opções de destino', async () => {
    const usuario = userEvent.setup();
    render(<FormularioTransferencia aberto aoFechar={vi.fn()} />, { wrapper: Wrapper });

    const comboboxes = await screen.findAllByRole('combobox');
    await usuario.click(exigir(comboboxes[0], 'combobox de origem ausente'));
    await usuario.click(await screen.findByRole('option', { name: /Banco Principal/ }));

    await usuario.click(exigir(comboboxes[1], 'combobox de destino ausente'));
    expect(await screen.findByRole('option', { name: /Carteira/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Banco Principal/ })).toBeNull();
  });

  it('envia contaOrigemId, contaDestinoId, valor e data para criarTransferencia', async () => {
    const usuario = userEvent.setup();
    vi.mocked(transferenciaServico.criarTransferencia).mockResolvedValue(fabricarTransferencia());
    const aoFechar = vi.fn();
    render(<FormularioTransferencia aberto aoFechar={aoFechar} />, { wrapper: Wrapper });

    const comboboxes = await screen.findAllByRole('combobox');
    await usuario.click(exigir(comboboxes[0], 'combobox de origem ausente'));
    await usuario.click(await screen.findByRole('option', { name: /Banco Principal/ }));

    await usuario.click(exigir(comboboxes[1], 'combobox de destino ausente'));
    await usuario.click(await screen.findByRole('option', { name: /Carteira/ }));

    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '06/08/2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));

    await waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
    const chamada = vi.mocked(transferenciaServico.criarTransferencia).mock.calls[0]?.[0];
    expect(chamada).toMatchObject({
      contaOrigemId: 'conta-1',
      contaDestinoId: 'conta-2',
      valor: '100.00',
      data: '2026-08-06',
    });
  });

  it('destaca o campo de destino quando a API responde com contas iguais', async () => {
    const usuario = userEvent.setup();
    vi.mocked(transferenciaServico.criarTransferencia).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'CONTAS_IGUAIS',
      message: 'A conta de origem deve ser diferente da conta de destino.',
      errors: [{ campo: 'contaDestinoId', mensagem: 'Escolha uma conta diferente da origem.' }],
    });
    render(<FormularioTransferencia aberto aoFechar={vi.fn()} />, { wrapper: Wrapper });

    const comboboxes = await screen.findAllByRole('combobox');
    await usuario.click(exigir(comboboxes[0], 'combobox de origem ausente'));
    await usuario.click(await screen.findByRole('option', { name: /Banco Principal/ }));
    await usuario.click(exigir(comboboxes[1], 'combobox de destino ausente'));
    await usuario.click(await screen.findByRole('option', { name: /Carteira/ }));

    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '06/08/2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));

    expect(await screen.findByText('Escolha uma conta diferente da origem.')).toBeTruthy();
  });
});
