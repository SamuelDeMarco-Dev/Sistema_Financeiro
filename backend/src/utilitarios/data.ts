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
