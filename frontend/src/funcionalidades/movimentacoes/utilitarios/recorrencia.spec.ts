import { describe, expect, it } from 'vitest';
import { calcularProximaOcorrencia, proximasDatas } from './recorrencia';

describe('calcularProximaOcorrencia', () => {
  it('mensal a partir de 31/01 nao pula meses: cai em 28/02 em ano comum', () => {
    expect(calcularProximaOcorrencia('2026-01-31', 'MENSAL', 1)).toBe('2026-02-28');
  });

  it('mensal a partir de 31/01, indice 2, preserva o dia 31 em marco', () => {
    expect(calcularProximaOcorrencia('2026-01-31', 'MENSAL', 2)).toBe('2026-03-31');
  });

  it('mensal a partir de 31/01 em ano bissexto cai em 29/02', () => {
    expect(calcularProximaOcorrencia('2024-01-31', 'MENSAL', 1)).toBe('2024-02-29');
  });

  it('diaria soma dias corridos multiplicados pelo intervalo', () => {
    expect(calcularProximaOcorrencia('2026-08-05', 'DIARIA', 3)).toBe('2026-08-08');
  });

  it('semanal soma 7 dias por intervalo', () => {
    expect(calcularProximaOcorrencia('2026-08-05', 'SEMANAL', 2)).toBe('2026-08-19');
  });
});

describe('proximasDatas', () => {
  it('a primeira data e a propria ancora, sem pular meses curtos', () => {
    expect(proximasDatas('2026-01-31', 'MENSAL', 1, 3)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('respeita o intervalo informado', () => {
    expect(proximasDatas('2026-01-05', 'MENSAL', 2, 3)).toEqual([
      '2026-01-05',
      '2026-03-05',
      '2026-05-05',
    ]);
  });
});
