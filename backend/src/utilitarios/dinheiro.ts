import { Prisma } from '@prisma/client';

const CASAS_PADRAO = 2;

/** RN-07: todo calculo monetario do backend passa por aqui — nunca
 * `number`, `Number()`, `parseFloat()` ou `+` aritmetico sobre valor. */
export function somar(...valores: Prisma.Decimal[]): Prisma.Decimal {
  return valores.reduce((acumulado, valor) => acumulado.plus(valor), new Prisma.Decimal(0));
}

export function subtrair(minuendo: Prisma.Decimal, subtraendo: Prisma.Decimal): Prisma.Decimal {
  return minuendo.minus(subtraendo);
}

export function multiplicar(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return a.times(b);
}

export function dividir(dividendo: Prisma.Decimal, divisor: Prisma.Decimal): Prisma.Decimal {
  return dividendo.dividedBy(divisor);
}

export function arredondar(valor: Prisma.Decimal, casas: number = CASAS_PADRAO): Prisma.Decimal {
  return valor.toDecimalPlaces(casas);
}

/**
 * RN-21: rateia `valorTotal` em `quantidade` parcelas iguais, jogando a
 * diferenca de arredondamento na **ultima** parcela — garante
 * `Σ parcelas === valorTotal` exatamente, mesmo quando a divisao nao e
 * exata (ex.: 1000/3, 0.01/3).
 */
export function ratearParcelas(valorTotal: Prisma.Decimal, quantidade: number): Prisma.Decimal[] {
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new RangeError('A quantidade de parcelas deve ser um inteiro maior ou igual a 1.');
  }

  const base = valorTotal
    .dividedBy(quantidade)
    .toDecimalPlaces(CASAS_PADRAO, Prisma.Decimal.ROUND_DOWN);
  const ultima = valorTotal.minus(base.times(quantidade - 1));

  return [...Array.from({ length: quantidade - 1 }, () => base), ultima];
}

/** ADR-012: dinheiro na API e string decimal com 2 casas — "1234.56". */
export function paraStringApi(valor: Prisma.Decimal): string {
  return valor.toFixed(CASAS_PADRAO);
}

export function deStringApi(valor: string): Prisma.Decimal {
  return new Prisma.Decimal(valor);
}
