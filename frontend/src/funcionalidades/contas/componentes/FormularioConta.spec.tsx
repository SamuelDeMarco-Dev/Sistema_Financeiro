import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormularioConta } from './FormularioConta';
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

describe('FormularioConta', () => {
  it('modo criacao: envia os dados do formulario para criarConta', async () => {
    vi.mocked(contaServico.criarConta).mockResolvedValue(fabricarConta());
    const aoFechar = vi.fn();
    render(<FormularioConta aberto aoFechar={aoFechar} />, { wrapper: Wrapper });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Carteira' } });
    fireEvent.change(screen.getByLabelText('Saldo inicial'), { target: { value: '150,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
    const chamada = vi.mocked(contaServico.criarConta).mock.calls[0]?.[0];
    expect(chamada).toMatchObject({ nome: 'Carteira', saldoInicial: '150.00' });
  });

  it('modo edicao: preenche os valores atuais e envia atualizarConta', async () => {
    const conta = fabricarConta({ nome: 'Nome antigo' });
    vi.mocked(contaServico.atualizarConta).mockResolvedValue({ ...conta, nome: 'Nome novo' });
    const aoFechar = vi.fn();
    render(<FormularioConta aberto aoFechar={aoFechar} conta={conta} />, { wrapper: Wrapper });

    expect(screen.getByLabelText<HTMLInputElement>('Nome').value).toBe('Nome antigo');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Nome novo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
    const chamada = vi.mocked(contaServico.atualizarConta).mock.calls[0];
    expect(chamada?.[0]).toBe('conta-1');
    expect(chamada?.[1]).toMatchObject({ nome: 'Nome novo' });
  });

  it('rejeita nome com menos de 2 caracteres sem chamar a API', async () => {
    render(<FormularioConta aberto aoFechar={vi.fn()} />, { wrapper: Wrapper });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('O nome deve ter no minimo 2 caracteres.')).toBeTruthy();
    expect(contaServico.criarConta).not.toHaveBeenCalled();
  });

  it('mostra o erro traduzido quando a API falha', async () => {
    vi.mocked(contaServico.criarConta).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'CONFLITO',
      message: 'Já existe uma conta com esse nome.',
    });
    render(<FormularioConta aberto aoFechar={vi.fn()} />, { wrapper: Wrapper });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Carteira' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Já existe uma conta com esse nome.')).toBeTruthy();
  });
  it('escopo de grupo: manda o contaCompartilhadaId junto (04-API.md §10.2)', async () => {
    vi.mocked(contaServico.criarConta).mockResolvedValue(fabricarConta());
    render(<FormularioConta aberto aoFechar={vi.fn()} contaCompartilhadaId="grupo-1" />, {
      wrapper: Wrapper,
    });

    expect(screen.getByRole('heading', { name: 'Nova conta do grupo' })).toBeTruthy();
    expect(screen.getByText(/saldo dela entra no saldo do grupo/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Caixa da Casa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => {
      expect(contaServico.criarConta).toHaveBeenCalled();
    });
    expect(vi.mocked(contaServico.criarConta).mock.calls[0]?.[0]).toMatchObject({
      nome: 'Caixa da Casa',
      contaCompartilhadaId: 'grupo-1',
    });
  });

  it('escopo pessoal nao inventa contaCompartilhadaId', async () => {
    vi.mocked(contaServico.criarConta).mockResolvedValue(fabricarConta());
    render(<FormularioConta aberto aoFechar={vi.fn()} />, { wrapper: Wrapper });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Carteira' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => {
      expect(contaServico.criarConta).toHaveBeenCalled();
    });
    expect(vi.mocked(contaServico.criarConta).mock.calls[0]?.[0]).not.toHaveProperty(
      'contaCompartilhadaId',
    );
  });
});
