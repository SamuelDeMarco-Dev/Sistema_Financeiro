const PADRAO_ISO = /^\d{4}-\d{2}-\d{2}$/;

function paraIso(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Valida que a string e uma data no formato AAAA-MM-DD e que ela existe de
 * fato no calendario (rejeita "2026-02-30"). */
export function ehDataIsoValida(valor: string): boolean {
  if (!PADRAO_ISO.test(valor)) return false;
  const [ano = 0, mes = 0, dia = 0] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

/** RF-13/RNF-25: "hoje" depende do timezone do perfil, nao do timezone do
 * navegador — um usuario em America/Sao_Paulo pode ja estar em outro dia
 * calendario quando um usuario em UTC ainda nao esta. `en-CA` formata
 * nativamente como AAAA-MM-DD, sem precisar de biblioteca de datas. */
export function hojeNoTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Soma (ou subtrai, com `dias` negativo) dias calendario a uma data ISO.
 * Opera sobre um instante UTC "neutro" (meio-dia nao seria nem necessario
 * aqui, pois usamos os componentes ano/mes/dia diretamente) — nunca sobre o
 * timezone local do navegador, que deslocaria o dia perto da meia-noite. */
export function somarDias(dataIso: string, dias: number): string {
  const [ano = 0, mes = 0, dia = 0] = dataIso.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return paraIso(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate());
}

export function formatarDataBr(dataIso: string): string {
  const [ano = '', mes = '', dia = ''] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Converte "DD/MM/AAAA" para "AAAA-MM-DD"; `null` se o formato ou a data
 * forem invalidos. */
export function paraIsoDeBr(dataBr: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBr);
  const dia = partes?.[1];
  const mes = partes?.[2];
  const ano = partes?.[3];
  if (!dia || !mes || !ano) return null;
  const iso = `${ano}-${mes}-${dia}`;
  return ehDataIsoValida(iso) ? iso : null;
}

export interface DiaGrade {
  iso: string;
  dia: number;
  foraDoMes: boolean;
}

export const DIAS_SEMANA_ABREV = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

export function nomeMesAno(ano: number, mes: number): string {
  const data = new Date(Date.UTC(ano, mes - 1, 1));
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(data)
    .replace(/^./, (letra) => letra.toUpperCase());
}

/** Grade de semanas (7 colunas, domingo primeiro) do mes informado (`mes`
 * 1-indexado), completada com dias do mes anterior/seguinte para preencher
 * a primeira e a ultima semana. */
export function gerarGradeMes(ano: number, mes: number): DiaGrade[][] {
  const diaSemanaInicio = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

  const dias: DiaGrade[] = [];

  for (let i = diaSemanaInicio; i > 0; i--) {
    const data = new Date(Date.UTC(ano, mes - 1, 1 - i));
    dias.push({
      iso: paraIso(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate()),
      dia: data.getUTCDate(),
      foraDoMes: true,
    });
  }

  for (let dia = 1; dia <= ultimoDiaDoMes; dia++) {
    dias.push({ iso: paraIso(ano, mes, dia), dia, foraDoMes: false });
  }

  for (let diaSeguinte = 1; dias.length % 7 !== 0; diaSeguinte++) {
    const data = new Date(Date.UTC(ano, mes, diaSeguinte));
    dias.push({
      iso: paraIso(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate()),
      dia: data.getUTCDate(),
      foraDoMes: true,
    });
  }

  const semanas: DiaGrade[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
  return semanas;
}
