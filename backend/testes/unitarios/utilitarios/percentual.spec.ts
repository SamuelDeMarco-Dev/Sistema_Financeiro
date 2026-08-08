import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { distribuirPercentuais } from '@/utilitarios/percentual';

function decimais(...valores: string[]): Prisma.Decimal[] {
  return valores.map((valor) => new Prisma.Decimal(valor));
}

describe('distribuirPercentuais', () => {
  it('devolve array vazio para lista vazia', () => {
    expect(distribuirPercentuais([])).toEqual([]);
  });

  it('devolve zeros quando a soma total e zero', () => {
    expect(distribuirPercentuais(decimais('0.00', '0.00'))).toEqual([0, 0]);
  });

  it('categoria unica recebe 100', () => {
    expect(distribuirPercentuais(decimais('123.45'))).toEqual([100]);
  });

  it('divide 100 em 3 partes iguais e o ULTIMO absorve o resto do arredondamento', () => {
    const percentuais = distribuirPercentuais(decimais('100.00', '100.00', '100.00'));
    expect(percentuais).toEqual([33.33, 33.33, 33.34]);
    expect(percentuais.reduce((soma, p) => soma + p, 0)).toBe(100);
  });

  it('soma sempre exatamente 100 mesmo com muitos itens e valores irregulares', () => {
    const percentuais = distribuirPercentuais(decimais('37.11', '22.87', '19.40', '11.03', '9.59'));
    const soma = percentuais.reduce((acumulado, p) => acumulado + p, 0);
    expect(soma).toBe(100);
  });
});
