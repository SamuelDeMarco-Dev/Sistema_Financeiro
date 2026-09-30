export const FREQUENCIAS_RECORRENCIA = [
  'DIARIA',
  'SEMANAL',
  'QUINZENAL',
  'MENSAL',
  'BIMESTRAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
] as const;
export type FrequenciaRecorrencia = (typeof FREQUENCIAS_RECORRENCIA)[number];

export const ROTULO_FREQUENCIA: Record<FrequenciaRecorrencia, string> = {
  DIARIA: 'Diária',
  SEMANAL: 'Semanal',
  QUINZENAL: 'Quinzenal',
  MENSAL: 'Mensal',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
};

const FREQUENCIAS_EM_DIAS: Partial<Record<FrequenciaRecorrencia, number>> = {
  DIARIA: 1,
  SEMANAL: 7,
  QUINZENAL: 15,
};
const FREQUENCIAS_EM_MESES: Partial<Record<FrequenciaRecorrencia, number>> = {
  MENSAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

function paraIso(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Mesma logica de `calcularProximaOcorrencia` do backend (RN-17/RN-18):
 * sempre avanca a partir da data-ancora (nunca encadeia resultado a
 * resultado), preservando o dia original em vez do dia da ocorrencia
 * anterior — por isso 31/01 mensal gera 28-ou-29/02 e depois 31/03, nao
 * 28/03. So para pre-visualizacao no formulario, nunca enviada ao
 * backend (que recalcula por conta propria). */
export function calcularProximaOcorrencia(
  dataIso: string,
  frequencia: FrequenciaRecorrencia,
  intervalo: number,
): string {
  const [ano = 0, mes = 0, dia = 0] = dataIso.split('-').map(Number);

  const dias = FREQUENCIAS_EM_DIAS[frequencia];
  if (dias !== undefined) {
    const data = new Date(Date.UTC(ano, mes - 1, dia + dias * intervalo));
    return paraIso(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate());
  }

  const meses = FREQUENCIAS_EM_MESES[frequencia] ?? 1;
  const mesDestino = mes - 1 + meses * intervalo;
  const ultimoDiaDoMesDestino = new Date(Date.UTC(ano, mesDestino + 1, 0)).getUTCDate();
  const data = new Date(Date.UTC(ano, mesDestino, Math.min(dia, ultimoDiaDoMesDestino)));
  return paraIso(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate());
}

/** Pre-visualizacao das proximas ocorrencias (a propria `dataIso` e a
 * primeira) — usada pela secao de recorrencia do formulario. */
export function proximasDatas(
  dataIso: string,
  frequencia: FrequenciaRecorrencia,
  intervalo: number,
  quantidade: number,
): string[] {
  const datas = [dataIso];
  for (let indice = 1; indice < quantidade; indice += 1) {
    datas.push(calcularProximaOcorrencia(dataIso, frequencia, intervalo * indice));
  }
  return datas;
}
