import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import { DashboardRepositorio } from '@/repositorios/dashboard.repositorio';
import { PerfilRepositorio } from '@/repositorios/perfil.repositorio';
import { DashboardServico } from '@/servicos/dashboard.servico';
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

  beforeEach(() => {
    repositorio = mock();
    contaRepositorio = mock();
    perfilRepositorio = mock();
    servico = new DashboardServico(repositorio, contaRepositorio, perfilRepositorio);

    contaRepositorio.calcularSaldoConsolidadoPorUsuario.mockResolvedValue(new Prisma.Decimal(0));
    repositorio.somarReceitasEDespesas.mockResolvedValue({
      receitas: new Prisma.Decimal(0),
      despesas: new Prisma.Decimal(0),
    });
    repositorio.somarEfeitoPendentesAteData.mockResolvedValue(new Prisma.Decimal(0));
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
});
