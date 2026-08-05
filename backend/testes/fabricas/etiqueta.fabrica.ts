import { prisma } from '@/banco/cliente';
import type { Etiqueta } from '@prisma/client';

let contador = 0;

export async function fabricarEtiqueta(
  usuarioId: string,
  sobrescritas: Partial<{ nome: string; cor: string }> = {},
): Promise<Etiqueta> {
  contador += 1;

  return prisma.etiqueta.create({
    data: {
      usuarioId,
      nome: sobrescritas.nome ?? `etiqueta-de-teste-${contador}`,
      cor: sobrescritas.cor ?? '#64748B',
    },
  });
}
