import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { Perfil } from '@prisma/client';

export class PerfilRepositorio {
  async buscarPorUsuarioId(usuarioId: string): Promise<Perfil | null> {
    return prisma.perfil.findUnique({ where: { usuarioId } });
  }

  async atualizar(
    usuarioId: string,
    dados: Prisma.PerfilUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Perfil> {
    return (tx ?? prisma).perfil.update({ where: { usuarioId }, data: dados });
  }

  async definirFoto(usuarioId: string, fotoUrl: string | null): Promise<Perfil> {
    return prisma.perfil.update({ where: { usuarioId }, data: { fotoUrl } });
  }
}
