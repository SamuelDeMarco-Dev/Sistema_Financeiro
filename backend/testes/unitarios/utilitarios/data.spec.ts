import { describe, expect, it } from 'vitest';
import { doTimezoneDoPerfil, paraTimezoneDoPerfil } from '@/utilitarios/data';

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
});
