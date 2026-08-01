import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { registrarSerializadorDecimal } from '@/utilitarios/serializador-decimal';

describe('registrarSerializadorDecimal (ADR-012)', () => {
  it('serializa Decimal sempre com 2 casas, mesmo com valor inteiro ou com 1 casa', () => {
    registrarSerializadorDecimal();

    expect(JSON.stringify({ valor: new Prisma.Decimal('5') })).toBe('{"valor":"5.00"}');
    expect(JSON.stringify({ valor: new Prisma.Decimal('1234.5') })).toBe('{"valor":"1234.50"}');
    expect(JSON.stringify({ valor: new Prisma.Decimal('99.999') })).toBe('{"valor":"100.00"}');
  });

  it('nunca serializa Decimal como number no JSON', () => {
    registrarSerializadorDecimal();

    const json = JSON.stringify({ valor: new Prisma.Decimal('42.00') });
    expect(json).toBe('{"valor":"42.00"}');
    expect(JSON.parse(json).valor).toEqual(expect.any(String));
  });
});
