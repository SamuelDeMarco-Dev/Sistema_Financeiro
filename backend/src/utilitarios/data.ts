const CAMPOS_DATA_HORA: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

/** RF-13: le um instante UTC como se fosse hora local do timezone do
 * perfil, devolvendo um Date cujos getters *UTC* leem esses componentes —
 * usado por qualquer calculo que precise saber "que dia e" para o usuario
 * (ex.: inicio do dia, ciclo de fatura), nao so para exibicao.
 *
 * Usa Date.UTC() (nunca o construtor com string sem timezone) de proposito:
 * esse construtor interpreta a string no fuso do PROCESSO Node, o que
 * tornaria o resultado dependente de onde o servidor roda. */
export function paraTimezoneDoPerfil(instante: Date, timezone: string): Date {
  const partes = new Intl.DateTimeFormat('en-US', {
    ...CAMPOS_DATA_HORA,
    timeZone: timezone,
  }).formatToParts(instante);

  const valores: Record<string, number> = {};
  for (const parte of partes) {
    if (parte.type !== 'literal') valores[parte.type] = Number(parte.value);
  }

  return new Date(
    Date.UTC(
      valores.year ?? 1970,
      (valores.month ?? 1) - 1,
      valores.day ?? 1,
      valores.hour ?? 0,
      valores.minute ?? 0,
      valores.second ?? 0,
    ),
  );
}

/** Inverso de paraTimezoneDoPerfil: recebe um Date cujos componentes *UTC*
 * representam o horario de parede desejado no timezone do perfil, devolve
 * o instante UTC real correspondente. Duas passagens (aproximacao padrao
 * para conversao de fuso sem depender de uma base de dados de tz completa):
 * a diferenca entre "onde esse instante cairia no fuso" e o palpite inicial
 * e o proprio deslocamento do fuso naquele momento. */
export function doTimezoneDoPerfil(dataLocal: Date, timezone: string): Date {
  const comoVistoNoFuso = paraTimezoneDoPerfil(dataLocal, timezone);
  const desvioMs = comoVistoNoFuso.getTime() - dataLocal.getTime();
  return new Date(dataLocal.getTime() - desvioMs);
}

const PADRAO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Valida o formato AAAA-MM-DD e que a data existe de fato no calendario
 * (rejeita "2026-02-30"). Usado pelos schemas de `@db.Date` — nunca se
 * confia so no regex. */
export function ehDataIsoValida(valor: string): boolean {
  if (!PADRAO_DATA_ISO.test(valor)) return false;
  const [ano = 0, mes = 0, dia = 0] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

/** Converte AAAA-MM-DD num `Date` de meia-noite UTC — a forma que os
 * campos `@db.Date` do Prisma esperam ao escrever (chamar so depois de
 * `ehDataIsoValida` confirmar o formato). */
export function deDataIso(dataIso: string): Date {
  const [ano = 0, mes = 0, dia = 0] = dataIso.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Formata um `@db.Date` do Prisma (sempre meia-noite UTC) como
 * AAAA-MM-DD — usa getters *UTC* de proposito, nunca locais, para o
 * resultado nao depender do timezone do processo Node. */
export function paraDataIso(data: Date): string {
  const ano = String(data.getUTCFullYear()).padStart(4, '0');
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(data.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** RN-13: dataCompetencia entre hoje-20anos e hoje+10anos. Os limites sao
 * calculados a cada chamada (nunca no carregamento do modulo) para que o
 * teste de fronteira nao dependa de quando o processo comecou a rodar. */
export function dentroDoLimiteDeCompetencia(dataIso: string): boolean {
  if (!ehDataIsoValida(dataIso)) return false;
  const hoje = new Date();
  const limiteMinimo = new Date(
    Date.UTC(hoje.getUTCFullYear() - 20, hoje.getUTCMonth(), hoje.getUTCDate()),
  );
  const limiteMaximo = new Date(
    Date.UTC(hoje.getUTCFullYear() + 10, hoje.getUTCMonth(), hoje.getUTCDate()),
  );
  const [ano = 0, mes = 0, dia = 0] = dataIso.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data >= limiteMinimo && data <= limiteMaximo;
}
