import { Prisma } from '@prisma/client';

/**
 * Registra o ponto central de serializacao de dinheiro (ADR-012): toda
 * resposta da API expressa valores monetarios como string com 2 casas
 * ("1234.56"), nunca number.
 *
 * `JSON.stringify` chama `toJSON()` do valor **antes** de invocar qualquer
 * "replacer" — quando um `Prisma.Decimal` chega ao replacer, ja foi
 * convertido pelo `toJSON()' padrao do decimal.js (`toString()`, sem
 * casas fixas: "5", nao "5.00"). Por isso o ponto de controle real e o
 * proprio `toJSON`, nao um `app.set('json replacer', ...)` — que nunca
 * veria a instancia de Decimal.
 */
export function registrarSerializadorDecimal(): void {
  Prisma.Decimal.prototype.toJSON = function (this: Prisma.Decimal): string {
    return this.toFixed(2);
  };
}
