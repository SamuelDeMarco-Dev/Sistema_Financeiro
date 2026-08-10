import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import { DashboardRepositorio } from '@/repositorios/dashboard.repositorio';
import { PerfilRepositorio } from '@/repositorios/perfil.repositorio';
import { DashboardServico } from '@/servicos/dashboard.servico';
import { MovimentacaoServico } from '@/servicos/movimentacao.servico';
import type { Perfil } from '@prisma/client';

function fabricarPerfil(sobrescritas: Partial<Perfil> = {}): Perfil {
  return {
    id: 'perfil-1',
    usuarioId: 'usuario-1',
    fotoUrl: null,
    moedaPadrao: 'BRL',
    idioma: 'pt-BR',
    tema: 'SISTEMA',
    timezone: 'America/Sao_Paulo',
    formatoData: 'dd/MM/yyyy',
    primeiroDiaSemana: 0,
    notificacoesApp: true,
    notificacoesEmail: true,
    criadoEm: new Date('2026-01-01T00:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
    ...sobrescritas,
  };
}

describe('DashboardServico', () => {
  let servico: DashboardServico;
  let repositorio: MockProxy<DashboardRepositorio>;
  let contaRepositorio: MockProxy<ContaRepositorio>;
  let perfilRepositorio: MockProxy<PerfilRepositorio>;
  let movimentacaoServico: MockProxy<MovimentacaoServico>;

  beforeEach(() => {
    repositorio = mock();
    contaRepositorio = mock();
    perfilRepositorio = mock();
    movimentacaoServico = mock();
    servico = new DashboardServico(
      repositorio,
      contaRepositorio,
      perfilRepositorio,
      movimentacaoServico,
    );

    contaRepositorio.calcularSaldoConsolidadoPorUsuario.mockResolvedValue(new Prisma.Decimal(0));
    contaRepositorio.listarComSaldoPorUsuario.mockResolvedValue([]);
    repositorio.somarReceitasEDespesas.mockResolvedValue({
      receitas: new Prisma.Decimal(0),
      despesas: new Prisma.Decimal(0),
    });
    repositorio.somarEfeitoPendentesAteData.mockResolvedValue(new Prisma.Decimal(0));
    repositorio.obterFluxoCaixa.mockResolvedValue([]);
    repositorio.obterPorCategoria.mockResolvedValue([]);
    repositorio.contarVencimentosProximos.mockResolvedValue(0);
    movimentacaoServico.listar.mockResolvedValue({
      itens: [],
      paginacao: {
        pagina: 1,
        limite: 10,
        total: 0,
        totalPaginas: 1,
        temProxima: false,
        temAnterior: false,
      },
      totalizadores: {
        receitas: '0.00',
        despesas: '0.00',
        resultado: '0.00',
        receitasPendentes: '0.00',
        despesasPendentes: '0.00',
      },
    });
  });

  describe('resolverPeriodo', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('usa dataInicio/dataFim informados quando presentes, sem consultar o perfil', async () => {
      const periodo = await servico.resolverPeriodo('usuario-1', {
        dataInicio: '2026-03-01',
        dataFim: '2026-03-31',
      });

      expect(periodo.dataInicio.toISOString()).toBe('2026-03-01T00:00:00.000Z');
      expect(periodo.dataFim.toISOString()).toBe('2026-03-31T00:00:00.000Z');
      expect(perfilRepositorio.buscarPorUsuarioId).not.toHaveBeenCalled();
    });

    it('usa o mes corrente no timezone do PERFIL, nao no do servidor/UTC (RF-47)', async () => {
      // 01:00 UTC de 1/ago ainda e 31/jul as 22:00 em America/Sao_Paulo
      // (UTC-3) — se o servico usasse UTC (o "servidor"), resolveria agosto.
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-01T01:00:00.000Z'));
      perfilRepositorio.buscarPorUsuarioId.mockResolvedValue(
        fabricarPerfil({ timezone: 'America/Sao_Paulo' }),
      );

      const periodo = await servico.resolverPeriodo('usuario-1', {});

      expect(periodo.dataInicio.toISOString()).toBe('2026-07-01T00:00:00.000Z');
      expect(periodo.dataFim.toISOString()).toBe('2026-07-31T00:00:00.000Z');
    });

    it('usa America/Sao_Paulo como padrao quando o usuario nao tem perfil', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-15T12:00:00.000Z'));
      perfilRepositorio.buscarPorUsuarioId.mockResolvedValue(null);

      const periodo = await servico.resolverPeriodo('usuario-1', {});

      expect(periodo.dataInicio.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    });
  });

  describe('calcularIndicadores', () => {
    const PERIODO = {
      dataInicio: new Date('2026-07-01T00:00:00.000Z'),
      dataFim: new Date('2026-07-31T00:00:00.000Z'),
    };

    it('taxaPoupanca e 0 (nao NaN/Infinity) quando as receitas do periodo sao zero', async () => {
      repositorio.somarReceitasEDespesas.mockImplementation((_id, periodo) =>
        Promise.resolve(
          periodo.dataInicio.getTime() === PERIODO.dataInicio.getTime()
            ? { receitas: new Prisma.Decimal(0), despesas: new Prisma.Decimal(500) }
            : { receitas: new Prisma.Decimal(0), despesas: new Prisma.Decimal(0) },
        ),
      );

      const { indicadores } = await servico.calcularIndicadores('usuario-1', PERIODO);

      expect(indicadores.taxaPoupanca).toBe(0);
      expect(Number.isFinite(indicadores.taxaPoupanca)).toBe(true);
    });

    it('variacaoReceitas e 0 quando o periodo anterior nao teve receitas', async () => {
      repositorio.somarReceitasEDespesas.mockImplementation((_id, periodo) =>
        Promise.resolve(
          periodo.dataInicio.getTime() === PERIODO.dataInicio.getTime()
            ? { receitas: new Prisma.Decimal(1000), despesas: new Prisma.Decimal(0) }
            : { receitas: new Prisma.Decimal(0), despesas: new Prisma.Decimal(0) },
        ),
      );

      const { indicadores } = await servico.calcularIndicadores('usuario-1', PERIODO);

      expect(indicadores.variacaoReceitas).toBe(0);
    });

    it('calcula variacaoReceitas/variacaoDespesas contra o periodo anterior de mesma duracao', async () => {
      repositorio.somarReceitasEDespesas.mockImplementation((_id, periodo) =>
        Promise.resolve(
          periodo.dataInicio.getTime() === PERIODO.dataInicio.getTime()
            ? { receitas: new Prisma.Decimal(1100), despesas: new Prisma.Decimal(900) }
            : { receitas: new Prisma.Decimal(1000), despesas: new Prisma.Decimal(1000) },
        ),
      );

      const { indicadores } = await servico.calcularIndicadores('usuario-1', PERIODO);

      expect(indicadores.variacaoReceitas).toBe(10);
      expect(indicadores.variacaoDespesas).toBe(-10);
      const chamadaAnterior = repositorio.somarReceitasEDespesas.mock.calls[1]?.[1];
      expect(chamadaAnterior?.dataFim.toISOString()).toBe('2026-06-30T00:00:00.000Z');
    });

    it('saldoPrevisto soma o saldo atual ao efeito das pendentes/atrasadas', async () => {
      contaRepositorio.calcularSaldoConsolidadoPorUsuario.mockResolvedValue(
        new Prisma.Decimal('1000.00'),
      );
      repositorio.somarEfeitoPendentesAteData.mockResolvedValue(new Prisma.Decimal('-150.00'));

      const { indicadores } = await servico.calcularIndicadores('usuario-1', PERIODO);

      expect(indicadores.saldoAtual.toFixed(2)).toBe('1000.00');
      expect(indicadores.saldoPrevisto.toFixed(2)).toBe('850.00');
    });

    it('periodo.rotulo reflete o mes de dataInicio em pt-BR', async () => {
      const { periodo } = await servico.calcularIndicadores('usuario-1', PERIODO);

      expect(periodo.rotulo).toBe('Julho de 2026');
      expect(periodo.dataInicio).toBe('2026-07-01');
      expect(periodo.dataFim).toBe('2026-07-31');
    });
  });

  describe('obterFluxoCaixa', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('resolve a janela de meses a partir do mes corrente no timezone do perfil e mapeia as linhas', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-15T12:00:00.000Z'));
      perfilRepositorio.buscarPorUsuarioId.mockResolvedValue(
        fabricarPerfil({ timezone: 'America/Sao_Paulo' }),
      );
      repositorio.obterFluxoCaixa.mockResolvedValue([
        {
          mes: new Date('2026-08-01T00:00:00.000Z'),
          receitas: new Prisma.Decimal('1000.00'),
          despesas: new Prisma.Decimal('400.00'),
        },
      ]);

      const pontos = await servico.obterFluxoCaixa('usuario-1', { meses: 1 });

      expect(repositorio.obterFluxoCaixa).toHaveBeenCalledWith('usuario-1', {
        dataInicio: new Date('2026-08-01T00:00:00.000Z'),
        dataFim: new Date('2026-08-31T00:00:00.000Z'),
      });
      expect(pontos).toHaveLength(1);
      expect(pontos[0]?.mes).toBe('2026-08');
      expect(pontos[0]?.rotulo).toBe('ago/26');
      expect(pontos[0]?.receitas.toFixed(2)).toBe('1000.00');
      expect(pontos[0]?.despesas.toFixed(2)).toBe('400.00');
      expect(pontos[0]?.resultado.toFixed(2)).toBe('600.00');
    });
  });

  describe('obterPorCategoria', () => {
    it('repassa tipo, periodo resolvido e incluirSubcategorias ao repositorio', async () => {
      repositorio.obterPorCategoria.mockResolvedValue([
        {
          categoria_id: 'cat-1',
          categoria_nome: 'Mercado',
          categoria_cor: '#F97316',
          categoria_icone: 'shopping-cart',
          total: new Prisma.Decimal('300.00'),
          quantidade: 3,
        },
      ]);

      const itens = await servico.obterPorCategoria('usuario-1', {
        tipo: 'DESPESA',
        dataInicio: '2026-07-01',
        dataFim: '2026-07-31',
        incluirSubcategorias: true,
      });

      expect(repositorio.obterPorCategoria).toHaveBeenCalledWith(
        'usuario-1',
        'DESPESA',
        {
          dataInicio: new Date('2026-07-01T00:00:00.000Z'),
          dataFim: new Date('2026-07-31T00:00:00.000Z'),
        },
        true,
      );
      expect(itens).toHaveLength(1);
      expect(itens[0]?.categoria.nome).toBe('Mercado');
      expect(itens[0]?.percentual).toBe(100);
    });
  });

  describe('obterDashboard', () => {
    it('devolve todas as chaves documentadas, mesmo vazias (contasCompartilhadas/metas/orcamentos/cartoes)', async () => {
      const dashboard = await servico.obterDashboard('usuario-1', {});

      expect(Object.keys(dashboard).sort()).toEqual(
        [
          'alertas',
          'cartoes',
          'contas',
          'contasCompartilhadas',
          'despesasPorCategoria',
          'fluxoCaixa',
          'indicadores',
          'metas',
          'orcamentos',
          'periodo',
          'receitasPorCategoria',
          'ultimasMovimentacoes',
        ].sort(),
      );
      expect(dashboard.contasCompartilhadas).toEqual([]);
      expect(dashboard.metas).toEqual([]);
      expect(dashboard.orcamentos).toEqual([]);
      expect(dashboard.cartoes).toEqual([]);
    });

    it('nao gera alertas quando nao ha vencimentos proximos', async () => {
      repositorio.contarVencimentosProximos.mockResolvedValue(0);

      const dashboard = await servico.obterDashboard('usuario-1', {});

      expect(dashboard.alertas).toEqual([]);
    });

    it('gera um alerta de vencimento no singular para 1 conta', async () => {
      repositorio.contarVencimentosProximos.mockResolvedValue(1);

      const dashboard = await servico.obterDashboard('usuario-1', {});

      expect(dashboard.alertas).toEqual([
        {
          tipo: 'DESPESA_A_VENCER',
          severidade: 'INFORMACAO',
          titulo: '1 conta vence nos próximos 7 dias',
          urlAcao: '/movimentacoes?situacao=PENDENTE',
        },
      ]);
    });

    it('gera um alerta de vencimento no plural para varias contas', async () => {
      repositorio.contarVencimentosProximos.mockResolvedValue(3);

      const dashboard = await servico.obterDashboard('usuario-1', {});

      expect(dashboard.alertas[0]?.titulo).toBe('3 contas vencem nos próximos 7 dias');
    });

    it('executa as consultas em paralelo, nao em serie (tempo total perto do bloco mais lento)', async () => {
      const ATRASO_MS = 60;
      const atrasar = <T>(valor: T): Promise<T> =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(valor);
          }, ATRASO_MS);
        });

      contaRepositorio.calcularSaldoConsolidadoPorUsuario.mockImplementation(() =>
        atrasar(new Prisma.Decimal(0)),
      );
      repositorio.somarReceitasEDespesas.mockImplementation(() =>
        atrasar({ receitas: new Prisma.Decimal(0), despesas: new Prisma.Decimal(0) }),
      );
      repositorio.obterFluxoCaixa.mockImplementation(() => atrasar([]));
      repositorio.obterPorCategoria.mockImplementation(() => atrasar([]));
      contaRepositorio.listarComSaldoPorUsuario.mockImplementation(() => atrasar([]));
      repositorio.contarVencimentosProximos.mockImplementation(() => atrasar(0));

      const inicio = Date.now();
      await servico.obterDashboard('usuario-1', {});
      const duracaoMs = Date.now() - inicio;

      // Sequencial custaria bem mais que 7 * ATRASO_MS; em paralelo fica
      // perto de um unico ATRASO_MS (com folga generosa para nao ser
      // flaky em maquina ocupada).
      expect(duracaoMs).toBeLessThan(ATRASO_MS * 3);
    });
  });
});
