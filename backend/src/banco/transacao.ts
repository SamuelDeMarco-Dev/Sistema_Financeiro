import { prisma } from '@/banco/cliente';
import type { Prisma } from '@prisma/client';

/** Unico jeito de um servico abrir uma transacao sem importar `prisma`
 * diretamente — servico so orquestra QUAIS chamadas de repositorio
 * pertencem a mesma transacao; quem executa e o repositorio, com o `tx`
 * propagado (CLAUDE.md regra 2 e regra 10). */
export function executarTransacao<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
