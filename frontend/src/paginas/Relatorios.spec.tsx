import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as perfilServico from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import * as relatorioServico from '@/funcionalidades/relatorios/servicos/relatorio.servico';
import type {
  RelatorioAnual,
  RelatorioFluxoCaixa,
  RelatorioMensal,
  RelatorioPorCategoria,
  RelatorioPorConta,
} from '@/funcionalidades/relatorios/tipos/relatorio';
import { Relatorios } from './Relatorios';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/relatorios/servicos/relatorio.servico');
vi.mock('@/funcionalidades/perfil/servicos/perfil.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={['/relatorios?aba=MENSAL&ano=2026&mes=8']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
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

function fabricarMensal(): RelatorioMensal {
  return {
    periodo: { ano: 2026, mes: 8, rotulo: 'Agosto de 2026' },
    resumo: {
      receitas: '1000.00',
      despesas: '400.00',
      resultado: '600.00',
      saldoInicial: '2000.00',
      saldoFinal: '2600.00',
    },
    porCategoria: { receitas: [], despesas: [] },
    porConta: [],
    porDia: [],
    maioresDespesas: [],
    comparativoMesAnterior: {
      receitas: { atual: '1000.00', anterior: '900.00', variacao: 11.1 },
      despesas: { atual: '400.00', anterior: '450.00', variacao: -11.1 },
    },
  };
}

function fabricarAnual(): RelatorioAnual {
  return {
    ano: 2026,
    resumo: {
      receitas: '12000.00',
      despesas: '5000.00',
      resultado: '7000.00',
      mediaMensalReceitas: '1000.00',
      mediaMensalDespesas: '416.67',
      taxaPoupancaMedia: 58.3,
    },
    porMes: [],
    porCategoria: [],
    melhorMes: { mes: 8, resultado: '600.00' },
    piorMes: { mes: 2, resultado: '100.00' },
  };
}

function fabricarPorCategoria(): RelatorioPorCategoria {
  return {
    periodo: { dataInicio: '2026-08-01', dataFim: '2026-08-31' },
    tipo: 'DESPESA',
    itens: [],
    total: '0.00',
  };
}

function fabricarPorConta(): RelatorioPorConta {
  return {
    periodo: { dataInicio: '2026-08-01', dataFim: '2026-08-31' },
    itens: [
      {
        conta: { id: 'conta-1', nome: 'Banco Principal' },
        receitas: '1000.00',
        despesas: '400.00',
        resultado: '600.00',
        saldoInicial: '2000.00',
        saldoFinal: '2600.00',
      },
    ],
    totais: { receitas: '1000.00', despesas: '400.00', resultado: '600.00' },
  };
}

function fabricarFluxoCaixa(): RelatorioFluxoCaixa {
  return {
    periodo: { dataInicio: '2026-08-01', dataFim: '2026-08-31' },
    granularidade: 'DIARIA',
    saldoInicial: '2000.00',
    pontos: [{ data: '2026-08-01', delta: '100.00', saldoAcumulado: '2100.00' }],
    saldoFinal: '2600.00',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(perfilServico.consultarPerfil).mockResolvedValue(fabricarPerfil());
  vi.mocked(relatorioServico.obterRelatorioMensal).mockResolvedValue(fabricarMensal());
  vi.mocked(relatorioServico.obterRelatorioAnual).mockResolvedValue(fabricarAnual());
  vi.mocked(relatorioServico.obterRelatorioPorCategoria).mockResolvedValue(fabricarPorCategoria());
  vi.mocked(relatorioServico.obterRelatorioPorConta).mockResolvedValue(fabricarPorConta());
  vi.mocked(relatorioServico.obterRelatorioFluxoCaixa).mockResolvedValue(fabricarFluxoCaixa());
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe('Relatorios', () => {
  it('mostra a aba Mensal por padrão com os indicadores do resumo', async () => {
    render(<Relatorios />, { wrapper: Wrapper });

    expect(await screen.findByText('Saldo inicial')).toBeTruthy();
    expect(screen.getByText('R$ 2.000,00')).toBeTruthy();
    expect(screen.getByText('R$ 2.600,00')).toBeTruthy();
  });

  it('trocar para a aba Por conta busca o relatório e mostra a linha com totais', async () => {
    render(<Relatorios />, { wrapper: Wrapper });
    await screen.findByText('Saldo inicial');

    await userEvent.click(screen.getByRole('tab', { name: 'Por conta' }));

    expect(await screen.findByText('Banco Principal')).toBeTruthy();
    await waitFor(() => {
      expect(relatorioServico.obterRelatorioPorConta).toHaveBeenCalledWith({
        dataInicio: '2026-08-01',
        dataFim: '2026-08-31',
      });
    });
  });

  it('trocar para a aba Anual usa navegação por ano em vez de mês', async () => {
    render(<Relatorios />, { wrapper: Wrapper });
    await screen.findByText('Saldo inicial');

    await userEvent.click(screen.getByRole('tab', { name: 'Anual' }));

    expect(await screen.findByText('Receitas do ano')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ano anterior' })).toBeTruthy();
  });

  it('trocar de aba preserva o período selecionado', async () => {
    render(<Relatorios />, { wrapper: Wrapper });
    await screen.findByText('Saldo inicial');

    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    await waitFor(() => {
      expect(relatorioServico.obterRelatorioMensal).toHaveBeenCalledWith(2026, 9);
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Fluxo de caixa' }));

    await waitFor(() => {
      expect(relatorioServico.obterRelatorioFluxoCaixa).toHaveBeenCalledWith(
        expect.objectContaining({ dataInicio: '2026-09-01', dataFim: '2026-09-30' }),
      );
    });
  });

  it('o botão de exportar está desabilitado com dica de disponibilidade futura', async () => {
    render(<Relatorios />, { wrapper: Wrapper });
    await screen.findByText('Saldo inicial');

    const botaoExportar = screen.getByRole('button', { name: /Exportar/ });
    expect(botaoExportar.getAttribute('disabled')).not.toBeNull();
    expect(botaoExportar.getAttribute('title')).toBe('Disponível na v2.0');
  });

  it('na aba Fluxo de caixa, alternar granularidade busca o relatório mensal', async () => {
    render(<Relatorios />, { wrapper: Wrapper });
    await screen.findByText('Saldo inicial');

    await userEvent.click(screen.getByRole('tab', { name: 'Fluxo de caixa' }));
    await screen.findByText('Evolução do saldo');

    await userEvent.click(screen.getByRole('button', { name: 'Mensal' }));

    await waitFor(() => {
      expect(relatorioServico.obterRelatorioFluxoCaixa).toHaveBeenCalledWith(
        expect.objectContaining({ granularidade: 'MENSAL' }),
      );
    });
  });
});
