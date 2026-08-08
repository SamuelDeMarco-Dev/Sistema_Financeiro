import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as categoriaServico from '@/funcionalidades/categorias/servicos/categoria.servico';
import * as contaServico from '@/funcionalidades/contas/servicos/conta.servico';
import * as dashboardServico from '@/funcionalidades/dashboard/servicos/dashboard.servico';
import type { Dashboard as DashboardTipo } from '@/funcionalidades/dashboard/tipos/dashboard';
import * as etiquetaServico from '@/funcionalidades/etiquetas/servicos/etiqueta.servico';
import * as perfilServico from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import { Dashboard } from './Dashboard';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/dashboard/servicos/dashboard.servico');
vi.mock('@/funcionalidades/contas/servicos/conta.servico');
vi.mock('@/funcionalidades/categorias/servicos/categoria.servico');
vi.mock('@/funcionalidades/etiquetas/servicos/etiqueta.servico');
vi.mock('@/funcionalidades/perfil/servicos/perfil.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
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

function fabricarDashboard(sobrescritas: Partial<DashboardTipo> = {}): DashboardTipo {
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
    ...sobrescritas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(perfilServico.consultarPerfil).mockResolvedValue(fabricarPerfil());
  vi.mocked(contaServico.listarContas).mockResolvedValue({
    contas: [],
    totalizadores: { saldoTotal: '0.00', quantidadeContas: 0 },
  });
  vi.mocked(categoriaServico.listarCategorias).mockResolvedValue([]);
  vi.mocked(etiquetaServico.listarEtiquetas).mockResolvedValue([]);
  // GraficoLinha/GraficoPizza usam usePrefersReducedMotion, que chama
  // matchMedia no mount — jsdom nao implementa isto por padrao.
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe('Dashboard', () => {
  it('mostra esqueletos por seção enquanto carrega, nao um spinner de pagina inteira', () => {
    vi.mocked(dashboardServico.obterDashboard).mockReturnValue(new Promise(() => undefined));

    render(<Dashboard />, { wrapper: Wrapper });

    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('mostra estado de erro com ação de tentar novamente', async () => {
    vi.mocked(dashboardServico.obterDashboard).mockRejectedValue(new Error('falhou'));

    render(<Dashboard />, { wrapper: Wrapper });

    expect(await screen.findByText('Não foi possível carregar o dashboard.')).toBeTruthy();
  });

  it('usuario sem contas nem movimentacoes ve o estado vazio orientando o primeiro passo', async () => {
    vi.mocked(dashboardServico.obterDashboard).mockResolvedValue(fabricarDashboard());

    render(<Dashboard />, { wrapper: Wrapper });

    expect(await screen.findByText('Bem-vindo ao seu Gerenciador de Finanças')).toBeTruthy();
  });

  it('com dados, mostra indicadores, fluxo de caixa, categorias, movimentações e contas', async () => {
    vi.mocked(dashboardServico.obterDashboard).mockResolvedValue(
      fabricarDashboard({
        contas: [
          {
            id: 'conta-1',
            nome: 'Banco Principal',
            tipo: 'CONTA_CORRENTE',
            saldoAtual: '1000.00',
            cor: '#2563EB',
            icone: 'wallet',
          },
        ],
      }),
    );

    render(<Dashboard />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Saldo atual')).toBeTruthy();
    });
    expect(screen.getByText('Banco Principal')).toBeTruthy();
    expect(screen.queryByText('Bem-vindo ao seu Gerenciador de Finanças')).toBeNull();
  });

  it('mostra os alertas quando presentes', async () => {
    vi.mocked(dashboardServico.obterDashboard).mockResolvedValue(
      fabricarDashboard({
        contas: [
          {
            id: 'conta-1',
            nome: 'Banco',
            tipo: 'CARTEIRA',
            saldoAtual: '10.00',
            cor: '#000',
            icone: 'wallet',
          },
        ],
        alertas: [
          {
            tipo: 'DESPESA_A_VENCER',
            severidade: 'INFORMACAO',
            titulo: '2 contas vencem nos próximos 7 dias',
            urlAcao: '/movimentacoes?situacao=PENDENTE',
          },
        ],
      }),
    );

    render(<Dashboard />, { wrapper: Wrapper });

    expect(await screen.findByText('2 contas vencem nos próximos 7 dias')).toBeTruthy();
  });

  it('trocar o periodo no seletor busca o dashboard novamente com o novo intervalo', async () => {
    vi.mocked(dashboardServico.obterDashboard).mockResolvedValue(fabricarDashboard());

    render(<Dashboard />, { wrapper: Wrapper });
    await screen.findByText('Bem-vindo ao seu Gerenciador de Finanças');
    vi.mocked(dashboardServico.obterDashboard).mockClear();

    await userEvent.click(screen.getByRole('button', { name: 'Últimos 30 dias' }));

    await waitFor(() => {
      expect(dashboardServico.obterDashboard).toHaveBeenCalled();
    });
    const chamada = vi.mocked(dashboardServico.obterDashboard).mock.calls.at(-1)?.[0];
    expect(chamada?.dataInicio).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('clicar em "Nova movimentação" abre o formulário', async () => {
    vi.mocked(dashboardServico.obterDashboard).mockResolvedValue(
      fabricarDashboard({
        contas: [
          {
            id: 'conta-1',
            nome: 'Banco',
            tipo: 'CARTEIRA',
            saldoAtual: '10.00',
            cor: '#000',
            icone: 'wallet',
          },
        ],
      }),
    );

    render(<Dashboard />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Saldo atual')).toBeTruthy();
    });

    // Dois botoes acessiveis com o mesmo nome existem no DOM (cabecalho
    // desktop + acao flutuante mobile) — em runtime real, `lg:hidden`
    // garante que so um fica visivel por vez; no jsdom os dois existem.
    const [botao] = screen.getAllByRole('button', { name: 'Nova movimentação' });
    if (!botao) throw new Error('botão "Nova movimentação" não encontrado');
    await userEvent.click(botao);

    expect(await screen.findByRole('dialog')).toBeTruthy();
  });
});
