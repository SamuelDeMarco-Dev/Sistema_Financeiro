import { prisma } from '@/banco/cliente';
import type { Categoria, TipoCategoria } from '@prisma/client';

let contador = 0;

export async function fabricarCategoria(
  usuarioId: string,
  sobrescritas: Partial<{ nome: string; tipo: TipoCategoria; categoriaPaiId: string }> = {},
): Promise<Categoria> {
  contador += 1;

  return prisma.categoria.create({
    data: {
      usuarioId,
      nome: sobrescritas.nome ?? `Categoria de Teste ${contador}`,
      tipo: sobrescritas.tipo ?? 'DESPESA',
      categoriaPaiId: sobrescritas.categoriaPaiId ?? null,
    },
  });
}
