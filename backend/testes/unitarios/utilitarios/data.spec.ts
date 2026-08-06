import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calcularOrdinalOcorrencia,
  calcularProximaOcorrencia,
  deDataIso,
  dentroDoLimiteDeCompetencia,
  doTimezoneDoPerfil,
  ehDataIsoValida,
  hojeNoTimezone,
  paraDataIso,
  paraTimezoneDoPerfil,
} from '@/utilitarios/data';

describe('utilitarios/data', () => {
  describe('paraTimezoneDoPerfil', () => {
    it('le a hora local de America/Sao_Paulo (UTC-3, sem horario de verao)', () => {
      const meiaNoiteUtc = new Date('2026-06-15T00:00:00.000Z');

      const resultado = paraTimezoneDoPerfil(meiaNoiteUtc, 'America/Sao_Paulo');

      expect(resultado.getUTCHours()).toBe(21); // 00:00 UTC = 21:00 do dia anterior em SP
      expect(resultado.getUTCDate()).toBe(14);
    });

    it('nao depende do timezone do processo Node (usa Date.UTC internamente)', () => {
      const instante = new Date('2026-01-01T12:00:00.000Z');

      const resultado = paraTimezoneDoPerfil(instante, 'UTC');

      expect(resultado.getUTCHours()).toBe(12);
      expect(resultado.getUTCFullYear()).toBe(2026);
    });
  });

  describe('doTimezoneDoPerfil', () => {
    it('e o inverso de paraTimezoneDoPerfil (ida e volta preserva o instante)', () => {
      const instanteOriginal = new Date('2026-03-10T18:30:00.000Z');
      const timezone = 'America/Sao_Paulo';

      const local = paraTimezoneDoPerfil(instanteOriginal, timezone);
      const deVolta = doTimezoneDoPerfil(local, timezone);

      expect(deVolta.getTime()).toBe(instanteOriginal.getTime());
    });

    it('funciona tambem para um fuso com horario de verao (America/New_York)', () => {
      const instanteOriginal = new Date('2026-07-04T16:00:00.000Z');
      const timezone = 'America/New_York';

      const local = paraTimezoneDoPerfil(instanteOriginal, timezone);
      const deVolta = doTimezoneDoPerfil(local, timezone);

      expect(deVolta.getTime()).toBe(instanteOriginal.getTime());
    });
  });

  describe('hojeNoTimezone', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('usa o dia local do timezone, nao o dia UTC, quando ja e amanha em UTC', () => {
      // 22:00 em Sao Paulo (UTC-3) de 04/08 e 01:00 UTC de 05/08.
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-05T01:00:00.000Z'));

      const resultado = hojeNoTimezone('America/Sao_Paulo');

      expect(resultado.getUTCFullYear()).toBe(2026);
      expect(resultado.getUTCMonth()).toBe(7); // agosto (0-indexado)
      expect(resultado.getUTCDate()).toBe(4);
      expect(resultado.getUTCHours()).toBe(0);
    });

    it('para UTC, o dia local coincide com o dia do instante', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-05T23:00:00.000Z'));

      const resultado = hojeNoTimezone('UTC');

      expect(resultado.getUTCDate()).toBe(5);
    });
  });

  describe('calcularProximaOcorrencia (RN-17/RN-18)', () => {
    it('MENSAL a partir de 31/01 nao pula meses: cai em fevereiro (28 em ano comum)', () => {
      const ancora = new Date('2026-01-31T00:00:00.000Z');

      const resultado = calcularProximaOcorrencia(ancora, 'MENSAL', 1);

      expect(resultado.toISOString().slice(0, 10)).toBe('2026-02-28');
    });

    it('MENSAL a partir de 31/01, indice 2 (dois meses), preserva o dia 31 em marco', () => {
      const ancora = new Date('2026-01-31T00:00:00.000Z');

      const resultado = calcularProximaOcorrencia(ancora, 'MENSAL', 2);

      expect(resultado.toISOString().slice(0, 10)).toBe('2026-03-31');
    });

    it('MENSAL a partir de 31/01 em ano bissexto cai em 29/02', () => {
      const ancora = new Date('2024-01-31T00:00:00.000Z');

      const resultado = calcularProximaOcorrencia(ancora, 'MENSAL', 1);

      expect(resultado.toISOString().slice(0, 10)).toBe('2024-02-29');
    });

    it('ANUAL a partir de 29/02 (bissexto) cai em 28/02 no ano seguinte (nao bissexto)', () => {
      const ancora = new Date('2024-02-29T00:00:00.000Z');

      const resultado = calcularProximaOcorrencia(ancora, 'ANUAL', 1);

      expect(resultado.toISOString().slice(0, 10)).toBe('2025-02-28');
    });

    it('DIARIA soma dias corridos multiplicados pelo intervalo', () => {
      const ancora = new Date('2026-08-05T00:00:00.000Z');

      const resultado = calcularProximaOcorrencia(ancora, 'DIARIA', 3);

      expect(resultado.toISOString().slice(0, 10)).toBe('2026-08-08');
    });

    it('SEMANAL soma 7 dias por intervalo', () => {
      const ancora = new Date('2026-08-05T00:00:00.000Z');

      const resultado = calcularProximaOcorrencia(ancora, 'SEMANAL', 2);

      expect(resultado.toISOString().slice(0, 10)).toBe('2026-08-19');
    });
  });

  describe('calcularOrdinalOcorrencia', () => {
    it('a propria ancora e a ocorrencia numero 1', () => {
      const ancora = new Date('2026-07-05T00:00:00.000Z');

      expect(calcularOrdinalOcorrencia(ancora, ancora, 'MENSAL', 1)).toBe(1);
    });

    it('conta meses corridos para frequencia MENSAL', () => {
      const ancora = new Date('2026-01-05T00:00:00.000Z');
      const ocorrencia = new Date('2026-07-05T00:00:00.000Z');

      expect(calcularOrdinalOcorrencia(ancora, ocorrencia, 'MENSAL', 1)).toBe(7);
    });

    it('conta dias corridos para frequencia DIARIA', () => {
      const ancora = new Date('2026-08-01T00:00:00.000Z');
      const ocorrencia = new Date('2026-08-04T00:00:00.000Z');

      expect(calcularOrdinalOcorrencia(ancora, ocorrencia, 'DIARIA', 1)).toBe(4);
    });
  });

  describe('ehDataIsoValida', () => {
    it('aceita uma data valida', () => {
      expect(ehDataIsoValida('2026-08-05')).toBe(true);
    });

    it('rejeita formato fora do padrao AAAA-MM-DD', () => {
      expect(ehDataIsoValida('05/08/2026')).toBe(false);
    });

    it('rejeita dia inexistente (30 de fevereiro)', () => {
      expect(ehDataIsoValida('2026-02-30')).toBe(false);
    });

    it('aceita 29 de fevereiro em ano bissexto', () => {
      expect(ehDataIsoValida('2024-02-29')).toBe(true);
    });
  });

  describe('dentroDoLimiteDeCompetencia (RN-13)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('aceita hoje', () => {
      expect(dentroDoLimiteDeCompetencia('2026-08-05')).toBe(true);
    });

    it('aceita exatamente 10 anos no futuro', () => {
      expect(dentroDoLimiteDeCompetencia('2036-08-05')).toBe(true);
    });

    it('rejeita 10 anos e 1 dia no futuro', () => {
      expect(dentroDoLimiteDeCompetencia('2036-08-06')).toBe(false);
    });

    it('aceita exatamente 20 anos no passado', () => {
      expect(dentroDoLimiteDeCompetencia('2006-08-05')).toBe(true);
    });

    it('rejeita 20 anos e 1 dia no passado', () => {
      expect(dentroDoLimiteDeCompetencia('2006-08-04')).toBe(false);
    });

    it('rejeita data em formato invalido', () => {
      expect(dentroDoLimiteDeCompetencia('05-08-2026')).toBe(false);
    });
  });

  describe('deDataIso / paraDataIso', () => {
    it('deDataIso produz meia-noite UTC', () => {
      const data = deDataIso('2026-08-05');

      expect(data.getUTCFullYear()).toBe(2026);
      expect(data.getUTCMonth()).toBe(7);
      expect(data.getUTCDate()).toBe(5);
      expect(data.getUTCHours()).toBe(0);
    });

    it('paraDataIso e o inverso de deDataIso', () => {
      expect(paraDataIso(deDataIso('2026-08-05'))).toBe('2026-08-05');
    });

    it('paraDataIso usa getters UTC, nao locais', () => {
      const data = new Date(Date.UTC(2026, 0, 1));

      expect(paraDataIso(data)).toBe('2026-01-01');
    });
  });
});
