import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import { DashboardRepositorio } from '@/repositorios/dashboard.repositorio';
import { PerfilRepositorio } from '@/repositorios/perfil.repositorio';
import { ContaCompartilhadaServico } from '@/servicos/conta-compartilhada.servico';
import { MovimentacaoServico } from '@/servicos/movimentacao.servico';
import { deDataIso, hojeNoTimezone } from '@/utilitarios/data';
import {
  mapearContasCompartilhadasResumo,
  mapearContasComSaldo,
  mapearFluxoCaixa,
  mapearPeriodo,
  mapearPorCategoria,
} from '@/utilitarios/mapear-dashboard';
import type {
  AlertaDTO,
  ContaCompartilhadaResumoDashboardDTO,
  ContaResumoDashboardDTO,
  FluxoCaixaPontoDTO,
  IndicadoresDTO,
  PeriodoDTO,
  PorCategoriaItemDTO,
} from '@/utilitarios/mapear-dashboard';
import type { MovimentacaoDTO } from '@/utilitarios/mapear-movimentacao';
import { percentualVariacao } from '@/utilitarios/percentual';
import { periodoAnterior, primeiroEUltimoDiaDoMes, ultimosMeses } from '@/utilitarios/periodo';
import type { Periodo } from '@/utilitarios/periodo';
import { registrador } from '@/utilitarios/registrador';
import type {
  ObterFluxoCaixaQuery,
  ObterIndicadoresQuery,
  ObterPorCategoriaQuery,
} from '@/validadores/dashboard.validador';

interface PeriodoOpcionalQuery {
  dataInicio?: string | undefined;
  dataFim?: string | undefined;
}

export interface DashboardDTO {
  periodo: PeriodoDTO;
  indicadores: IndicadoresDTO;
  fluxoCaixa: FluxoCaixaPontoDTO[];
  despesasPorCategoria: PorCategoriaItemDTO[];
  receitasPorCategoria: PorCategoriaItemDTO[];
  ultimasMovimentacoes: MovimentacaoDTO[];
  contas: ContaResumoDashboardDTO[];
  contasCompartilhadas: ContaCompartilhadaResumoDashboardDTO[];
  metas: never[];
  orcamentos: never[];
  alertas: AlertaDTO[];
  cartoes: never[];
}

const MESES_FLUXO_CAIXA_PADRAO = 12;
const DIAS_ALERTA_VENCIMENTO = 7;
const UM_DIA_MS = 24 * 60 * 60 * 1000;
const ULTIMAS_MOVIMENTACOES_LIMITE = 10;
const CASAS_PERCENTUAL = 2;

export class DashboardServico {
  constructor(
    private readonly repositorio = new DashboardRepositorio(),
    private readonly contaRepositorio = new ContaRepositorio(),
    private readonly perfilRepositorio = new PerfilRepositorio(),
    private readonly movimentacaoServico = new MovimentacaoServico(),
    private readonly contaCompartilhadaServico = new ContaCompartilhadaServico(),
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
  async resolverPeriodo(usuarioId: string, query: PeriodoOpcionalQuery): Promise<Periodo> {
    if (query.dataInicio !== undefined && query.dataFim !== undefined) {
      return { dataInicio: deDataIso(query.dataInicio), dataFim: deDataIso(query.dataFim) };
    }
    const hoje = await this.hojeDoUsuario(usuarioId);
    return primeiroEUltimoDiaDoMes(hoje);
  }

  /** RF-41: sempre `query.meses` pontos terminando no mes corrente (no
   * timezone do perfil) — o endpoint nao aceita `dataFim` escolhido pelo
   * cliente, so a quantidade de meses a olhar para tras. */
  async obterFluxoCaixa(
    usuarioId: string,
    query: ObterFluxoCaixaQuery,
  ): Promise<FluxoCaixaPontoDTO[]> {
    const hoje = await this.hojeDoUsuario(usuarioId);
    const periodo = ultimosMeses(query.meses, hoje);
    const linhas = await this.repositorio.obterFluxoCaixa(usuarioId, periodo);
    return mapearFluxoCaixa(linhas);
  }

  /** RF-42: reaproveita `resolverPeriodo` (mesma regra de periodo padrao
   * de #47) — "sem categoria" e "agrupar na raiz" ficam a cargo do
   * repositorio/mapeador, o servico so orquestra periodo + agregacao. */
  async obterPorCategoria(
    usuarioId: string,
    query: ObterPorCategoriaQuery,
  ): Promise<PorCategoriaItemDTO[]> {
    const periodo = await this.resolverPeriodo(usuarioId, query);
    const linhas = await this.repositorio.obterPorCategoria(
      usuarioId,
      query.tipo,
      periodo,
      query.incluirSubcategorias,
    );
    return mapearPorCategoria(linhas);
  }

  /** RF-40 a RF-47, RF-43: tudo o que a tela inicial precisa numa unica
   * viagem — todas as consultas rodam em `Promise.all` (nunca em serie)
   * para o tempo total ficar perto do bloco mais lento, nao da soma de
   * todos. `metas`/`orcamentos`/`cartoes` seguem arrays vazios ate as
   * Milestones correspondentes (M7/M9/M8) — a chave existe desde ja para o
   * frontend nao precisar de un branch por milestone. */
  async obterDashboard(usuarioId: string, query: ObterIndicadoresQuery): Promise<DashboardDTO> {
    const inicio = process.hrtime.bigint();
    const periodo = await this.resolverPeriodo(usuarioId, query);
    const hoje = await this.hojeDoUsuario(usuarioId);
    const fluxoCaixaPeriodo = ultimosMeses(MESES_FLUXO_CAIXA_PADRAO, hoje);
    const limiteAlerta = new Date(hoje.getTime() + DIAS_ALERTA_VENCIMENTO * UM_DIA_MS);

    const [
      { indicadores },
      fluxoCaixaLinhas,
      despesasLinhas,
      receitasLinhas,
      ultimasMovimentacoes,
      contas,
      vencimentosProximos,
      contasCompartilhadas,
    ] = await Promise.all([
      this.calcularIndicadores(usuarioId, periodo),
      this.repositorio.obterFluxoCaixa(usuarioId, fluxoCaixaPeriodo),
      this.repositorio.obterPorCategoria(usuarioId, 'DESPESA', periodo, false),
      this.repositorio.obterPorCategoria(usuarioId, 'RECEITA', periodo, false),
      this.buscarUltimasMovimentacoes(usuarioId),
      this.contaRepositorio.listarComSaldoPorUsuario(usuarioId),
      this.repositorio.contarVencimentosProximos(usuarioId, hoje, limiteAlerta),
      this.contaCompartilhadaServico.listar(usuarioId),
    ]);

    const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1_000_000;
    registrador.info(
      { usuarioId, duracaoMs: Math.round(duracaoMs * 100) / 100 },
      'Dashboard agregado calculado.',
    );

    return {
      periodo: mapearPeriodo(periodo),
      indicadores,
      fluxoCaixa: mapearFluxoCaixa(fluxoCaixaLinhas),
      despesasPorCategoria: mapearPorCategoria(despesasLinhas),
      receitasPorCategoria: mapearPorCategoria(receitasLinhas),
      ultimasMovimentacoes,
      contas: mapearContasComSaldo(contas),
      contasCompartilhadas: mapearContasCompartilhadasResumo(contasCompartilhadas),
      metas: [],
      orcamentos: [],
      alertas: this.gerarAlertas(vencimentosProximos),
      cartoes: [],
    };
  }

  private gerarAlertas(vencimentosProximos: number): AlertaDTO[] {
    if (vencimentosProximos === 0) return [];
    const plural = vencimentosProximos === 1 ? 'conta' : 'contas';
    return [
      {
        tipo: 'DESPESA_A_VENCER',
        severidade: 'INFORMACAO',
        titulo: `${vencimentosProximos} ${plural} vence${vencimentosProximos === 1 ? '' : 'm'} nos próximos 7 dias`,
        urlAcao: '/movimentacoes?situacao=PENDENTE',
      },
    ];
  }

  private async buscarUltimasMovimentacoes(usuarioId: string): Promise<MovimentacaoDTO[]> {
    const { itens } = await this.movimentacaoServico.listar(usuarioId, {
      pagina: 1,
      limite: ULTIMAS_MOVIMENTACOES_LIMITE,
      ordenarPor: 'dataCompetencia',
      ordem: 'desc',
      campoData: 'COMPETENCIA',
    });
    return itens;
  }

  private async hojeDoUsuario(usuarioId: string): Promise<Date> {
    const perfil = await this.perfilRepositorio.buscarPorUsuarioId(usuarioId);
    return hojeNoTimezone(perfil?.timezone ?? 'America/Sao_Paulo');
  }
}
