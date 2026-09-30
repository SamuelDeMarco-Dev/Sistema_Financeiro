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

function formatarIso(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** RF-73/RF-74: as abas de período livre (por categoria, por conta, fluxo
 * de caixa) sempre mostram UM MÊS por vez — o mesmo `ano`/`mes` das abas
 * Mensal/Anual, para "troca de aba preserva o período" ser trivial (o
 * estado é um só, so a interpretacao muda por aba). */
export function primeiroEUltimoDiaDoMes(
  ano: number,
  mes: number,
): { dataInicio: string; dataFim: string } {
  return {
    dataInicio: formatarIso(ano, mes, 1),
    dataFim: formatarIso(ano, mes, ultimoDiaDoMes(ano, mes)),
  };
}

export function rotuloMesCompleto(ano: number, mes: number): string {
  const nome = MESES_COMPLETOS[mes - 1] ?? 'Mês inválido';
  return `${nome} de ${ano}`;
}
