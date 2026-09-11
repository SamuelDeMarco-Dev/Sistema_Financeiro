const UM_DIA_MS = 24 * 60 * 60 * 1000;

export interface Periodo {
  dataInicio: Date;
  dataFim: Date;
}

/** RF-47: primeiro e ultimo dia do mes de `data` — usado como periodo
 * padrao do dashboard quando o usuario nao informa `dataInicio`/`dataFim`.
 * `data` deve ser meia-noite UTC (ex.: `hojeNoTimezone(perfil.timezone)`),
 * mesma convencao de `@db.Date` do restante do projeto. */
export function primeiroEUltimoDiaDoMes(data: Date): Periodo {
  const ano = data.getUTCFullYear();
  const mes = data.getUTCMonth();
  return {
    dataInicio: new Date(Date.UTC(ano, mes, 1)),
    dataFim: new Date(Date.UTC(ano, mes + 1, 0)),
  };
}

/** RF-41: janela de `quantidadeMeses` meses terminando no mes de
 * `dataReferencia` (inclusive) — usada pelo fluxo de caixa, que sempre
 * conta "para tras" a partir do mes corrente, nunca a partir de um
 * `dataFim` escolhido pelo usuario (o endpoint so aceita `meses`). */
export function ultimosMeses(quantidadeMeses: number, dataReferencia: Date): Periodo {
  const ano = dataReferencia.getUTCFullYear();
  const mes = dataReferencia.getUTCMonth();
  return {
    dataInicio: new Date(Date.UTC(ano, mes - (quantidadeMeses - 1), 1)),
    dataFim: new Date(Date.UTC(ano, mes + 1, 0)),
  };
}

/** RF-72: primeiro/ultimo dia do mes de CALENDARIO anterior a (ano, mes)
 * 1-indexado — usado pelo comparativo do relatorio mensal, que compara
 * com "o mes anterior" mesmo (fevereiro vs janeiro), nao com um periodo
 * de mesma duracao em dias (isso e RF-47, que serve ao dashboard, cujo
 * periodo pode ser arbitrario). `Date.UTC` com mes -1 rola para dezembro
 * do ano anterior de proposito — evita um `if (mes === 1)` a parte. */
export function mesAnteriorCalendario(ano: number, mes: number): Periodo {
  return primeiroEUltimoDiaDoMes(new Date(Date.UTC(ano, mes - 2, 1)));
}

/** RF-47 (variacao dos indicadores): periodo imediatamente anterior, com a
 * mesma duracao em dias — nao "o mes anterior", que teria um numero
 * diferente de dias (fevereiro inclusive). Comparar por duracao igual e o
 * que torna a variacao percentual significativa. */
export function periodoAnterior(periodo: Periodo): Periodo {
  const duracaoDias =
    Math.round((periodo.dataFim.getTime() - periodo.dataInicio.getTime()) / UM_DIA_MS) + 1;
  const dataFim = new Date(periodo.dataInicio.getTime() - UM_DIA_MS);
  const dataInicio = new Date(dataFim.getTime() - (duracaoDias - 1) * UM_DIA_MS);
  return { dataInicio, dataFim };
}
