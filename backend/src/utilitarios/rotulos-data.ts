// Nomes fixos em pt-BR em vez de Intl.DateTimeFormat: o resultado nao pode
// depender dos dados de ICU disponiveis no ambiente que roda o processo
// (container de CI, VPS, etc.) — RF-41/RF-47 exigem o rotulo em pt-BR
// sempre, independente de onde o backend roda.
const MESES_ABREVIADOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

const MESES_COMPLETOS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

/** RF-47: rotulo completo do periodo do dashboard/relatorio mensal —
 * "Julho de 2026". Le os componentes *UTC* de `data` (mesma convencao de
 * `paraDataIso`), nunca locais. */
export function rotuloMesCompleto(data: Date): string {
  const mes = MESES_COMPLETOS[data.getUTCMonth()] ?? 'Mes invalido';
  return `${mes} de ${data.getUTCFullYear()}`;
}

/** RF-41: rotulo abreviado do fluxo de caixa — "jul/26". */
export function rotuloMesAbreviado(data: Date): string {
  const mes = MESES_ABREVIADOS[data.getUTCMonth()] ?? '???';
  const anoCurto = String(data.getUTCFullYear()).slice(-2);
  return `${mes}/${anoCurto}`;
}

/** RF-72: rotulo do `porMes` do relatorio anual — "jan", sem ano (o ano
 * ja e um campo proprio da resposta, repeti-lo em cada mes seria ruido). */
export function rotuloMesSemAno(data: Date): string {
  return MESES_ABREVIADOS[data.getUTCMonth()] ?? '???';
}
