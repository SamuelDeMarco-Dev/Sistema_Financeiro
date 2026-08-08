import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/servicos/api';
import { obterDashboard } from './dashboard.servico';
import type { Dashboard } from '../tipos/dashboard';

vi.mock('@/servicos/api', () => ({
  api: { get: vi.fn() },
}));

function fabricarDashboard(): Dashboard {
  return {
    periodo: { dataInicio: '2026-07-01', dataFim: '2026-07-31', rotulo: 'Julho de 2026' },
    indicadores: {
      saldoAtual: '1000.00',
      receitas: '500.00',
      despesas: '200.00',
      resultado: '300.00',
      saldoPrevisto: '1100.00',
      variacaoReceitas: 5,
      variacaoDespesas: -2,
      taxaPoupanca: 60,
    },
    fluxoCaixa: [],
    despesasPorCategoria: [],
    receitasPorCategoria: [],
    ultimasMovimentacoes: [],
    contas: [],
    contasCompartilhadas: [],
    metas: [],
    orcamentos: [],
    alertas: [],
    cartoes: [],
  };
}

describe('dashboard.servico', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('obterDashboard() desempacota data e repassa os filtros como params', async () => {
    const dashboard = fabricarDashboard();
    vi.mocked(api.get).mockResolvedValue({ data: { data: dashboard } });

    const resultado = await obterDashboard({ dataInicio: '2026-07-01', dataFim: '2026-07-31' });

    expect(resultado).toEqual(dashboard);
    expect(api.get).toHaveBeenCalledWith('/dashboard', {
      params: { dataInicio: '2026-07-01', dataFim: '2026-07-31' },
    });
  });

  it('obterDashboard() sem filtros envia params vazios (backend usa o padrao)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: fabricarDashboard() } });

    await obterDashboard();

    expect(api.get).toHaveBeenCalledWith('/dashboard', { params: {} });
  });
});
