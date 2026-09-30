import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ehDataIsoValida,
  formatarDataBr,
  gerarGradeMes,
  hojeNoTimezone,
  nomeMesAno,
  paraIsoDeBr,
  somarDias,
} from './data';

describe('utilitarios/data', () => {
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

    it('rejeita 29 de fevereiro em ano nao bissexto', () => {
      expect(ehDataIsoValida('2026-02-29')).toBe(false);
    });
  });

  describe('hojeNoTimezone', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('depende do timezone informado, nao do timezone do navegador', () => {
      // 02h UTC de 1o de janeiro: em America/Sao_Paulo (UTC-3) ainda e 31 de
      // dezembro do ano anterior.
      vi.setSystemTime(new Date('2026-01-01T02:00:00.000Z'));

      expect(hojeNoTimezone('UTC')).toBe('2026-01-01');
      expect(hojeNoTimezone('America/Sao_Paulo')).toBe('2025-12-31');
    });
  });

  describe('somarDias', () => {
    it('soma dias dentro do mesmo mes', () => {
      expect(somarDias('2026-08-05', 3)).toBe('2026-08-08');
    });

    it('subtrai dias virando o mes', () => {
      expect(somarDias('2026-08-01', -1)).toBe('2026-07-31');
    });

    it('soma dias virando o ano', () => {
      expect(somarDias('2025-12-31', 1)).toBe('2026-01-01');
    });

    it('respeita o dia 29 de fevereiro em ano bissexto', () => {
      expect(somarDias('2024-02-28', 1)).toBe('2024-02-29');
    });
  });

  describe('formatarDataBr / paraIsoDeBr', () => {
    it('formatarDataBr converte AAAA-MM-DD para DD/MM/AAAA', () => {
      expect(formatarDataBr('2026-08-05')).toBe('05/08/2026');
    });

    it('paraIsoDeBr converte DD/MM/AAAA para AAAA-MM-DD', () => {
      expect(paraIsoDeBr('05/08/2026')).toBe('2026-08-05');
    });

    it('paraIsoDeBr retorna null para formato invalido', () => {
      expect(paraIsoDeBr('2026-08-05')).toBeNull();
    });

    it('paraIsoDeBr retorna null para data inexistente', () => {
      expect(paraIsoDeBr('30/02/2026')).toBeNull();
    });

    it('e a inversa exata uma da outra', () => {
      expect(paraIsoDeBr(formatarDataBr('2026-01-15'))).toBe('2026-01-15');
    });
  });

  describe('nomeMesAno', () => {
    it('formata o mes e ano em pt-BR com inicial maiuscula', () => {
      expect(nomeMesAno(2026, 8)).toBe('Agosto de 2026');
    });
  });

  describe('gerarGradeMes', () => {
    it('toda semana tem exatamente 7 dias', () => {
      const semanas = gerarGradeMes(2026, 8);
      for (const semana of semanas) {
        expect(semana).toHaveLength(7);
      }
    });

    it('contem todos os dias do mes, sem foraDoMes', () => {
      const semanas = gerarGradeMes(2026, 8);
      const diasDoMes = semanas.flat().filter((dia) => !dia.foraDoMes);
      expect(diasDoMes).toHaveLength(31);
      expect(diasDoMes[0]?.iso).toBe('2026-08-01');
      expect(diasDoMes[diasDoMes.length - 1]?.iso).toBe('2026-08-31');
    });

    it('completa a primeira e a ultima semana com dias de outros meses', () => {
      // Agosto de 2026 comeca numa sexta-feira — a primeira semana precisa
      // de dom/seg/qui/qua/qui de julho para completar 7 colunas.
      const semanas = gerarGradeMes(2026, 8);
      const primeiraSemana = semanas[0];
      const ultimaSemana = semanas[semanas.length - 1];

      expect(primeiraSemana?.some((dia) => dia.foraDoMes)).toBe(true);
      expect(ultimaSemana?.some((dia) => dia.foraDoMes)).toBe(true);
    });

    it('lida corretamente com fevereiro em ano bissexto', () => {
      const semanas = gerarGradeMes(2024, 2);
      const diasDoMes = semanas.flat().filter((dia) => !dia.foraDoMes);
      expect(diasDoMes).toHaveLength(29);
    });
  });
});
