import { Prisma } from '@prisma/client';

const CASAS_PERCENTUAL = 2;

/** RF-42/RF-72: distribui 100% entre `totais` (mesma ordem), arredondando
 * cada um para 2 casas — a soma de percentuais arredondados de forma
 * independente quase nunca da exatamente 100,00. Em vez disso, calcula
 * todos os itens exceto o ULTIMO e da a ele o que falta para fechar
 * 100,00 exato, absorvendo o erro de arredondamento — por isso quem chama
 * deve ordenar `totais` de forma que o ultimo item seja o mais tolerante
 * a esse ajuste (ex.: o menor total, numa lista ja ordenada decrescente). */
export function distribuirPercentuais(totais: Prisma.Decimal[]): number[] {
  if (totais.length === 0) return [];

  const somaTotal = totais.reduce((soma, total) => soma.plus(total), new Prisma.Decimal(0));
  if (somaTotal.isZero()) return totais.map(() => 0);

  const percentuais = totais.map((total) =>
    Number(total.dividedBy(somaTotal).times(100).toDecimalPlaces(CASAS_PERCENTUAL)),
  );
  const somaSemUltimo = percentuais.slice(0, -1).reduce((soma, percentual) => soma + percentual, 0);
  percentuais[percentuais.length - 1] = Number((100 - somaSemUltimo).toFixed(CASAS_PERCENTUAL));
  return percentuais;
}

/** RF-47/RF-72: variacao percentual de `atual` contra `anterior` — 0
 * quando nao ha base de comparacao (periodo anterior zerado), nunca
 * `NaN`/`Infinity`. */
export function percentualVariacao(atual: Prisma.Decimal, anterior: Prisma.Decimal): number {
  if (anterior.isZero()) return 0;
  return Number(
    atual.minus(anterior).dividedBy(anterior).times(100).toDecimalPlaces(CASAS_PERCENTUAL),
  );
}
