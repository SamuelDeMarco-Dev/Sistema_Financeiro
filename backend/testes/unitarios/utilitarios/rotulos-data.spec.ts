import { describe, expect, it } from 'vitest';
import { rotuloMesAbreviado, rotuloMesCompleto } from '@/utilitarios/rotulos-data';

describe('rotuloMesCompleto', () => {
  it('formata "Julho de 2026"', () => {
    expect(rotuloMesCompleto(new Date(Date.UTC(2026, 6, 1)))).toBe('Julho de 2026');
  });

  it('formata janeiro (indice 0)', () => {
    expect(rotuloMesCompleto(new Date(Date.UTC(2026, 0, 1)))).toBe('Janeiro de 2026');
  });
});

describe('rotuloMesAbreviado', () => {
  it('formata "jul/26"', () => {
    expect(rotuloMesAbreviado(new Date(Date.UTC(2026, 6, 1)))).toBe('jul/26');
  });

  it('formata dezembro com ano de 4 digitos truncado para 2', () => {
    expect(rotuloMesAbreviado(new Date(Date.UTC(2025, 11, 1)))).toBe('dez/25');
  });
});
