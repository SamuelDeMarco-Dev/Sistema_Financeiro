import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { periodoDoAtalho } from './periodo';

const TIMEZONE = 'America/Sao_Paulo';

describe('periodoDoAtalho', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ESTE_MES cobre do dia 1 ao ultimo dia do mes corrente', () => {
    vi.setSystemTime(new Date('2026-08-15T12:00:00.000Z'));

    const periodo = periodoDoAtalho('ESTE_MES', TIMEZONE);

    expect(periodo).toEqual({ dataInicio: '2026-08-01', dataFim: '2026-08-31' });
  });

  it('ESTE_MES respeita mes de fevereiro em ano bissexto', () => {
    vi.setSystemTime(new Date('2024-02-10T12:00:00.000Z'));

    const periodo = periodoDoAtalho('ESTE_MES', TIMEZONE);

    expect(periodo).toEqual({ dataInicio: '2024-02-01', dataFim: '2024-02-29' });
  });

  it('MES_PASSADO cobre o mes anterior por completo', () => {
    vi.setSystemTime(new Date('2026-08-15T12:00:00.000Z'));

    const periodo = periodoDoAtalho('MES_PASSADO', TIMEZONE);

    expect(periodo).toEqual({ dataInicio: '2026-07-01', dataFim: '2026-07-31' });
  });

  it('MES_PASSADO em janeiro cai em dezembro do ano anterior', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));

    const periodo = periodoDoAtalho('MES_PASSADO', TIMEZONE);

    expect(periodo).toEqual({ dataInicio: '2025-12-01', dataFim: '2025-12-31' });
  });

  it('ULTIMOS_30_DIAS cobre os 30 dias terminando hoje (inclusive)', () => {
    vi.setSystemTime(new Date('2026-08-15T12:00:00.000Z'));

    const periodo = periodoDoAtalho('ULTIMOS_30_DIAS', TIMEZONE);

    expect(periodo).toEqual({ dataInicio: '2026-07-17', dataFim: '2026-08-15' });
  });

  it('usa o dia local do timezone do perfil, nao o dia UTC', () => {
    // 22:00 em Sao Paulo (UTC-3) de 31/07 e 01:00 UTC de 01/08 — "hoje"
    // para o usuario ainda e 31/07.
    vi.setSystemTime(new Date('2026-08-01T01:00:00.000Z'));

    const periodo = periodoDoAtalho('ESTE_MES', TIMEZONE);

    expect(periodo).toEqual({ dataInicio: '2026-07-01', dataFim: '2026-07-31' });
  });
});
