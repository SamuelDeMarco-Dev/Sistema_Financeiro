import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  arredondar,
  deStringApi,
  dividir,
  multiplicar,
  paraStringApi,
  ratearParcelas,
  somar,
  subtrair,
} from '@/utilitarios/dinheiro';

function decimal(valor: string): Prisma.Decimal {
  return new Prisma.Decimal(valor);
}

describe('utilitarios/dinheiro', () => {
  describe('somar', () => {
    it('soma varios valores', () => {
      expect(somar(decimal('10.10'), decimal('5.05'), decimal('0.05')).toFixed(2)).toBe('15.20');
    });

    it('retorna zero sem argumentos', () => {
      expect(somar().toFixed(2)).toBe('0.00');
    });

    it('soma um unico valor', () => {
      expect(somar(decimal('42.42')).toFixed(2)).toBe('42.42');
    });
  });

  describe('subtrair', () => {
    it('subtrai o segundo valor do primeiro', () => {
      expect(subtrair(decimal('10.00'), decimal('3.33')).toFixed(2)).toBe('6.67');
    });

    it('permite resultado negativo', () => {
      expect(subtrair(decimal('3.00'), decimal('10.00')).toFixed(2)).toBe('-7.00');
    });
  });

  describe('multiplicar', () => {
    it('multiplica dois valores', () => {
      expect(multiplicar(decimal('2.50'), decimal('4')).toFixed(2)).toBe('10.00');
    });
  });

  describe('dividir', () => {
    it('divide dois valores', () => {
      expect(dividir(decimal('10'), decimal('4')).toFixed(2)).toBe('2.50');
    });
  });

  describe('arredondar', () => {
    it('arredonda para 2 casas por padrao', () => {
      expect(arredondar(decimal('10.005')).toFixed(2)).toBe('10.01');
    });

    it('aceita quantidade de casas explicita', () => {
      expect(arredondar(decimal('10.12345'), 3).toFixed(3)).toBe('10.123');
    });

    it('nao altera valor que ja tem a precisao alvo', () => {
      expect(arredondar(decimal('10.00')).toFixed(2)).toBe('10.00');
    });
  });

  describe('ratearParcelas', () => {
    it('rateia 1000.00 em 3 parcelas com o resto na ultima (RN-21)', () => {
      const parcelas = ratearParcelas(decimal('1000.00'), 3);

      expect(parcelas.map((p) => p.toFixed(2))).toEqual(['333.33', '333.33', '333.34']);
      expect(somar(...parcelas).toFixed(2)).toBe('1000.00');
    });

    it('rateia 100.00 em 7 parcelas somando exatamente o total', () => {
      const parcelas = ratearParcelas(decimal('100.00'), 7);

      expect(somar(...parcelas).toFixed(2)).toBe('100.00');
      expect(parcelas).toHaveLength(7);
    });

    it('rateia 0.05 em 2 parcelas somando exatamente o total', () => {
      const parcelas = ratearParcelas(decimal('0.05'), 2);

      expect(parcelas.map((p) => p.toFixed(2))).toEqual(['0.02', '0.03']);
      expect(somar(...parcelas).toFixed(2)).toBe('0.05');
    });

    it('rateia 10.00 em 4 parcelas somando exatamente o total', () => {
      const parcelas = ratearParcelas(decimal('10.00'), 4);

      expect(parcelas.map((p) => p.toFixed(2))).toEqual(['2.50', '2.50', '2.50', '2.50']);
      expect(somar(...parcelas).toFixed(2)).toBe('10.00');
    });

    it('rateia 0.01 em 3 parcelas somando exatamente o total', () => {
      const parcelas = ratearParcelas(decimal('0.01'), 3);

      expect(parcelas.map((p) => p.toFixed(2))).toEqual(['0.00', '0.00', '0.01']);
      expect(somar(...parcelas).toFixed(2)).toBe('0.01');
    });

    it('quantidade 1 retorna uma unica parcela com o valor total', () => {
      const parcelas = ratearParcelas(decimal('50.00'), 1);

      expect(parcelas.map((p) => p.toFixed(2))).toEqual(['50.00']);
    });

    it('rejeita quantidade zero', () => {
      expect(() => ratearParcelas(decimal('50.00'), 0)).toThrow(RangeError);
    });

    it('rejeita quantidade negativa', () => {
      expect(() => ratearParcelas(decimal('50.00'), -2)).toThrow(RangeError);
    });

    it('rejeita quantidade nao inteira', () => {
      expect(() => ratearParcelas(decimal('50.00'), 2.5)).toThrow(RangeError);
    });
  });

  describe('paraStringApi', () => {
    it('formata com 2 casas decimais', () => {
      expect(paraStringApi(decimal('10'))).toBe('10.00');
    });

    it('arredonda para 2 casas quando o valor tem mais precisao', () => {
      expect(paraStringApi(decimal('10.005'))).toBe('10.01');
    });
  });

  describe('deStringApi', () => {
    it('converte uma string decimal em Prisma.Decimal', () => {
      const valor = deStringApi('1234.56');

      expect(valor).toBeInstanceOf(Prisma.Decimal);
      expect(valor.toFixed(2)).toBe('1234.56');
    });
  });
});
