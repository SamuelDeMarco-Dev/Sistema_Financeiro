import type { FrequenciaRecorrencia } from '@prisma/client';

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

/** RF-13: "hoje" para um `@db.Date` (dataEfetivacao padrao ao pagar, issue
 * #37) depende do timezone do perfil, nao do timezone do processo Node —
 * so a data (meia-noite UTC), sem componente de hora. */
export function hojeNoTimezone(timezone: string): Date {
  const agora = paraTimezoneDoPerfil(new Date(), timezone);
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
}

/** "Hoje" para tarefas em lote que rodam uma vez para todos os usuarios
 * (issue #41) — sem timezone de perfil, porque nao ha um usuario
 * especifico. So a data (meia-noite UTC), sem componente de hora. */
export function hojeUtc(): Date {
  const agora = new Date();
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
}

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

/** RN-17/RN-18: avanca `intervalo` periodos de `frequencia` a partir de
 * `data`. Frequencias mensais e maiores preservam o *dia original* — nao
 * o dia da ocorrencia anterior — por isso o gerador de ocorrencias sempre
 * chama esta funcao a partir da data-ancora (multiplicando o intervalo
 * pelo indice da ocorrencia), nunca encadeando resultado a resultado.
 * Isso e o que garante 31/01 -> 28 ou 29/02 -> 31/03 em vez de
 * degradar para 28/03 (mes curto nao "contamina" os seguintes). Quando o
 * mes de destino e mais curto que o dia original, usa o ultimo dia do
 * mes de destino. */
export function calcularProximaOcorrencia(
  data: Date,
  frequencia: FrequenciaRecorrencia,
  intervalo: number,
): Date {
  const dias = FREQUENCIAS_EM_DIAS[frequencia];
  if (dias !== undefined) {
    return new Date(
      Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate() + dias * intervalo),
    );
  }

  const meses = FREQUENCIAS_EM_MESES[frequencia] ?? 1;
  const mesDestino = data.getUTCMonth() + meses * intervalo;
  const ultimoDiaDoMesDestino = new Date(
    Date.UTC(data.getUTCFullYear(), mesDestino + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(data.getUTCFullYear(), mesDestino, Math.min(data.getUTCDate(), ultimoDiaDoMesDestino)),
  );
}

/** Numero de ordem (1-based) de `dataOcorrencia` na serie que comeca em
 * `dataAncora` — usado so para exibicao (`recorrencia.ocorrenciaAtual`
 * no DTO). Calculado por aritmetica de calendario, nunca por contagem no
 * banco, para nao custar uma consulta extra por item numa listagem. */
export function calcularOrdinalOcorrencia(
  dataAncora: Date,
  dataOcorrencia: Date,
  frequencia: FrequenciaRecorrencia,
  intervalo: number,
): number {
  const dias = FREQUENCIAS_EM_DIAS[frequencia];
  if (dias !== undefined) {
    const diffDias = Math.round(
      (dataOcorrencia.getTime() - dataAncora.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.round(diffDias / (dias * intervalo)) + 1;
  }

  const meses = FREQUENCIAS_EM_MESES[frequencia] ?? 1;
  const diffMeses =
    (dataOcorrencia.getUTCFullYear() - dataAncora.getUTCFullYear()) * 12 +
    (dataOcorrencia.getUTCMonth() - dataAncora.getUTCMonth());
  return Math.round(diffMeses / (meses * intervalo)) + 1;
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
