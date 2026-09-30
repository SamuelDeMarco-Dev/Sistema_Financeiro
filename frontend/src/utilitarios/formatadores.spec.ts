import { describe, expect, it } from 'vitest';
import { formatarMoeda } from './formatadores';

// Intl.NumberFormat('pt-BR', { style: 'currency' }) separa "R$" do valor com
// U+00A0 (espaco nao separavel), nao um espaco comum.
const NBSP = String.fromCharCode(160);

describe('utilitarios/formatadores', () => {
  describe('formatarMoeda', () => {
    it('formata um valor positivo em pt-BR', () => {
      expect(formatarMoeda('1234.56')).toBe(['R$', '1.234,56'].join(NBSP));
    });

    it('formata um valor negativo com o sinal de menos (A11Y-01)', () => {
      expect(formatarMoeda('-50.00')).toContain('-');
      expect(formatarMoeda('-50.00')).toBe(['-R$', '50,00'].join(NBSP));
    });

    it('formata zero', () => {
      expect(formatarMoeda('0.00')).toBe(['R$', '0,00'].join(NBSP));
    });

    it('aceita outra moeda', () => {
      expect(formatarMoeda('10.00', 'USD')).toContain('10,00');
    });
  });
});
