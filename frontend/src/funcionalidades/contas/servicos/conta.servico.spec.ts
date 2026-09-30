import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/servicos/api';
import {
  arquivarConta,
  atualizarConta,
  criarConta,
  desarquivarConta,
  excluirConta,
  listarContas,
  listarResumoContas,
  reordenarContas,
} from './conta.servico';
import type { Conta } from '../tipos/conta';

vi.mock('@/servicos/api', () => ({
  api: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

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

describe('conta.servico', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('listarContas() desempacota contas e totalizadores', async () => {
    const conta = fabricarConta();
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: { contas: [conta] },
        meta: { totalizadores: { saldoTotal: '1000.00', quantidadeContas: 1 } },
      },
    });

    const resultado = await listarContas({ incluirArquivadas: true });

    expect(api.get).toHaveBeenCalledWith('/contas', { params: { incluirArquivadas: true } });
    expect(resultado.contas).toEqual([conta]);
    expect(resultado.totalizadores).toEqual({ saldoTotal: '1000.00', quantidadeContas: 1 });
  });

  it('listarResumoContas() desempacota o resumo', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: {
          contas: [
            { id: 'conta-1', nome: 'Carteira', tipo: 'CARTEIRA', cor: '#000', icone: 'wallet' },
          ],
        },
      },
    });

    const resultado = await listarResumoContas();

    expect(api.get).toHaveBeenCalledWith('/contas/resumo');
    expect(resultado).toHaveLength(1);
  });

  it('criarConta() posta o payload e devolve a conta criada', async () => {
    const conta = fabricarConta();
    vi.mocked(api.post).mockResolvedValue({ data: { data: { conta } } });

    const resultado = await criarConta({
      nome: 'Banco Principal',
      tipo: 'CONTA_CORRENTE',
      saldoInicial: '1000.00',
      cor: '#2563EB',
      icone: 'wallet',
      incluirNoSaldoTotal: true,
    });

    expect(api.post).toHaveBeenCalledWith(
      '/contas',
      expect.objectContaining({ nome: 'Banco Principal' }),
    );
    expect(resultado).toEqual(conta);
  });

  it('atualizarConta() usa PATCH /contas/:id', async () => {
    const conta = fabricarConta({ nome: 'Novo nome' });
    vi.mocked(api.patch).mockResolvedValue({ data: { data: { conta } } });

    const resultado = await atualizarConta('conta-1', { nome: 'Novo nome' });

    expect(api.patch).toHaveBeenCalledWith('/contas/conta-1', { nome: 'Novo nome' });
    expect(resultado.nome).toBe('Novo nome');
  });

  it('arquivarConta() usa PATCH /contas/:id/arquivar', async () => {
    const conta = fabricarConta({ arquivada: true });
    vi.mocked(api.patch).mockResolvedValue({ data: { data: { conta } } });

    const resultado = await arquivarConta('conta-1');

    expect(api.patch).toHaveBeenCalledWith('/contas/conta-1/arquivar');
    expect(resultado.arquivada).toBe(true);
  });

  it('desarquivarConta() usa PATCH /contas/:id/desarquivar', async () => {
    const conta = fabricarConta({ arquivada: false });
    vi.mocked(api.patch).mockResolvedValue({ data: { data: { conta } } });

    await desarquivarConta('conta-1');

    expect(api.patch).toHaveBeenCalledWith('/contas/conta-1/desarquivar');
  });

  it('reordenarContas() envia a lista de ordens', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });

    await reordenarContas([{ id: 'conta-1', ordem: 0 }]);

    expect(api.patch).toHaveBeenCalledWith('/contas/reordenar', {
      ordens: [{ id: 'conta-1', ordem: 0 }],
    });
  });

  it('excluirConta() usa DELETE /contas/:id', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} });

    await excluirConta('conta-1');

    expect(api.delete).toHaveBeenCalledWith('/contas/conta-1');
  });
});
