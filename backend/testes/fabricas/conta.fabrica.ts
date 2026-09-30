import { prisma } from '@/banco/cliente';
import type { Conta, Prisma, TipoConta } from '@prisma/client';

let contador = 0;

export async function fabricarConta(
  usuarioId: string,
  sobrescritas: Partial<{ nome: string; tipo: TipoConta; saldoInicial: Prisma.Decimal.Value }> = {},
): Promise<Conta> {
  contador += 1;

  return prisma.conta.create({
    data: {
      usuarioId,
      nome: sobrescritas.nome ?? `Conta de Teste ${contador}`,
      tipo: sobrescritas.tipo ?? 'CARTEIRA',
      saldoInicial: sobrescritas.saldoInicial ?? '0.00',
    },
  });
}
