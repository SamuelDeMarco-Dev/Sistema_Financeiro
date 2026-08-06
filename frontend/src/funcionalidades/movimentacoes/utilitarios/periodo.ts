import { hojeNoTimezone, somarDias } from '@/utilitarios/data';

export const ATALHOS_PERIODO = ['ESTE_MES', 'MES_PASSADO', 'ULTIMOS_30_DIAS'] as const;
export type AtalhoPeriodo = (typeof ATALHOS_PERIODO)[number];

export const ROTULO_ATALHO_PERIODO: Record<AtalhoPeriodo, string> = {
  ESTE_MES: 'Este mês',
  MES_PASSADO: 'Mês passado',
  ULTIMOS_30_DIAS: 'Últimos 30 dias',
};

function partesDeIso(iso: string): { ano: number; mes: number } {
  const [ano = 0, mes = 0] = iso.split('-').map(Number);
  return { ano, mes };
}

function formatarIso(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** RF-34: intervalo `[dataInicio, dataFim]` (ambas inclusivas) para cada
 * atalho da barra de filtros — "hoje" no timezone do perfil, nunca no do
 * navegador (mesmo raciocinio de `CampoData`). */
export function periodoDoAtalho(
  atalho: AtalhoPeriodo,
  timezone: string,
): { dataInicio: string; dataFim: string } {
  const hoje = hojeNoTimezone(timezone);

  if (atalho === 'ULTIMOS_30_DIAS') {
    return { dataInicio: somarDias(hoje, -29), dataFim: hoje };
  }

  const { ano, mes } = partesDeIso(hoje);
  if (atalho === 'ESTE_MES') {
    return {
      dataInicio: formatarIso(ano, mes, 1),
      dataFim: formatarIso(ano, mes, ultimoDiaDoMes(ano, mes)),
    };
  }

  // MES_PASSADO
  const referencia = new Date(Date.UTC(ano, mes - 2, 1));
  const anoAnterior = referencia.getUTCFullYear();
  const mesAnterior = referencia.getUTCMonth() + 1;
  return {
    dataInicio: formatarIso(anoAnterior, mesAnterior, 1),
    dataFim: formatarIso(anoAnterior, mesAnterior, ultimoDiaDoMes(anoAnterior, mesAnterior)),
  };
}
