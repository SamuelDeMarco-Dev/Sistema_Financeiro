import { Prisma } from '@prisma/client';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import { DashboardRepositorio } from '@/repositorios/dashboard.repositorio';
import { PerfilRepositorio } from '@/repositorios/perfil.repositorio';
import { deDataIso, hojeNoTimezone } from '@/utilitarios/data';
import { mapearPeriodo } from '@/utilitarios/mapear-dashboard';
import type { IndicadoresDTO, PeriodoDTO } from '@/utilitarios/mapear-dashboard';
import { periodoAnterior, primeiroEUltimoDiaDoMes } from '@/utilitarios/periodo';
import type { Periodo } from '@/utilitarios/periodo';
import type { ObterIndicadoresQuery } from '@/validadores/dashboard.validador';

const CASAS_PERCENTUAL = 2;

/** RF-47: variacao percentual de `atual` contra `anterior` — 0 quando nao
 * ha base de comparacao (periodo anterior zerado), nunca `NaN`/`Infinity`. */
function percentualVariacao(atual: Prisma.Decimal, anterior: Prisma.Decimal): number {
  if (anterior.isZero()) return 0;
  return Number(
    atual.minus(anterior).dividedBy(anterior).times(100).toDecimalPlaces(CASAS_PERCENTUAL),
  );
}

export class DashboardServico {
  constructor(
    private readonly repositorio = new DashboardRepositorio(),
    private readonly contaRepositorio = new ContaRepositorio(),
    private readonly perfilRepositorio = new PerfilRepositorio(),
  ) {}

  async obterIndicadores(
    usuarioId: string,
    query: ObterIndicadoresQuery,
  ): Promise<{ periodo: PeriodoDTO; indicadores: IndicadoresDTO }> {
    const periodo = await this.resolverPeriodo(usuarioId, query);
    return this.calcularIndicadores(usuarioId, periodo);
  }

  /** Reaproveitado pelo endpoint agregado (#50) para nao resolver o mesmo
   * periodo duas vezes nem duplicar a agregacao. */
  async calcularIndicadores(
    usuarioId: string,
    periodo: Periodo,
  ): Promise<{ periodo: PeriodoDTO; indicadores: IndicadoresDTO }> {
    const anterior = periodoAnterior(periodo);

    const [saldoAtual, atual, doAnterior, efeitoPendentes] = await Promise.all([
      this.contaRepositorio.calcularSaldoConsolidadoPorUsuario(usuarioId),
      this.repositorio.somarReceitasEDespesas(usuarioId, periodo),
      this.repositorio.somarReceitasEDespesas(usuarioId, anterior),
      this.repositorio.somarEfeitoPendentesAteData(usuarioId, periodo.dataFim),
    ]);

    const resultado = atual.receitas.minus(atual.despesas);
    const saldoPrevisto = saldoAtual.plus(efeitoPendentes);
    const taxaPoupanca = atual.receitas.isZero()
      ? 0
      : Number(resultado.dividedBy(atual.receitas).times(100).toDecimalPlaces(CASAS_PERCENTUAL));

    return {
      periodo: mapearPeriodo(periodo),
      indicadores: {
        saldoAtual,
        receitas: atual.receitas,
        despesas: atual.despesas,
        resultado,
        saldoPrevisto,
        variacaoReceitas: percentualVariacao(atual.receitas, doAnterior.receitas),
        variacaoDespesas: percentualVariacao(atual.despesas, doAnterior.despesas),
        taxaPoupanca,
      },
    };
  }

  /** RF-47: periodo padrao e o mes corrente no timezone do perfil, nao no
   * do processo Node — so entra em jogo quando o cliente nao informa
   * dataInicio/dataFim (o schema exige as duas juntas, ou nenhuma). */
  async resolverPeriodo(usuarioId: string, query: ObterIndicadoresQuery): Promise<Periodo> {
    if (query.dataInicio !== undefined && query.dataFim !== undefined) {
      return { dataInicio: deDataIso(query.dataInicio), dataFim: deDataIso(query.dataFim) };
    }
    const perfil = await this.perfilRepositorio.buscarPorUsuarioId(usuarioId);
    return primeiroEUltimoDiaDoMes(hojeNoTimezone(perfil?.timezone ?? 'America/Sao_Paulo'));
  }
}
