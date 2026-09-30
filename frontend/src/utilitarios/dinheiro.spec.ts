import { describe, expect, it } from 'vitest';
import { deCentavos, paraCentavos, somarValoresApi } from './dinheiro';

describe('utilitarios/dinheiro', () => {
  describe('paraCentavos', () => {
    it('converte um valor positivo simples', () => {
      expect(paraCentavos('1234.56')).toBe(123456);
    });

    it('converte um valor negativo', () => {
      expect(paraCentavos('-50.00')).toBe(-5000);
    });

    it('converte um valor inteiro sem parte decimal', () => {
      expect(paraCentavos('1000')).toBe(100000);
    });

    it('completa decimal com um digito apenas', () => {
      expect(paraCentavos('10.5')).toBe(1050);
    });

    it('converte zero', () => {
      expect(paraCentavos('0.00')).toBe(0);
    });

    it('converte valores muito pequenos', () => {
      expect(paraCentavos('0.01')).toBe(1);
    });
  });

  describe('deCentavos', () => {
    it('converte centavos positivos de volta para string decimal', () => {
      expect(deCentavos(123456)).toBe('1234.56');
    });

    it('converte centavos negativos de volta para string decimal', () => {
      expect(deCentavos(-5000)).toBe('-50.00');
    });

    it('e o inverso exato de paraCentavos', () => {
      for (const valor of ['1234.56', '-50.00', '0.00', '0.01', '999999.99']) {
        expect(deCentavos(paraCentavos(valor))).toBe(valor);
      }
    });
  });

  describe('somarValoresApi', () => {
    it('soma exatamente valores que teriam erro de ponto flutuante em Number', () => {
      // 0.1 + 0.2 em ponto flutuante binario resulta em 0.30000000000000004
      expect(somarValoresApi('0.10', '0.20')).toBe('0.30');
    });

    it('soma valores positivos e negativos', () => {
      expect(somarValoresApi('1000.00', '-300.50', '50.25')).toBe('749.75');
    });

    it('retorna zero para lista vazia', () => {
      expect(somarValoresApi()).toBe('0.00');
    });
  });
});
