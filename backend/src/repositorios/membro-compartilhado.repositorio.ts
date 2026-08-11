import { prisma } from '@/banco/cliente';
import type { MembroCompartilhado, PapelMembro, Prisma } from '@prisma/client';

interface LinhaMembroComUsuario extends MembroCompartilhado {
  usuario: { id: string; nome: string; email: string; perfil: { fotoUrl: string | null } | null };
}

export type MembroComUsuario = MembroCompartilhado & {
  usuario: { id: string; nome: string; email: string; fotoUrl: string | null };
};

export class MembroCompartilhadoRepositorio {
  /** Criado dentro da mesma transacao do grupo (RN-28: todo grupo nasce
   * com exatamente um ADMINISTRADOR — o proprio criador, RF-53). */
  async criarAdministrador(
    contaCompartilhadaId: string,
    usuarioId: string,
    tx: Prisma.TransactionClient,
  ): Promise<MembroCompartilhado> {
    return tx.membroCompartilhado.create({
      data: { contaCompartilhadaId, usuarioId, papel: 'ADMINISTRADOR' },
    });
  }

  async buscarAtivo(
    contaCompartilhadaId: string,
    usuarioId: string,
  ): Promise<MembroCompartilhado | null> {
    return prisma.membroCompartilhado.findFirst({
      where: { contaCompartilhadaId, usuarioId, situacao: 'ATIVO' },
    });
  }

  async listarAtivosComUsuario(contaCompartilhadaId: string): Promise<MembroComUsuario[]> {
    const linhas: LinhaMembroComUsuario[] = await prisma.membroCompartilhado.findMany({
      where: { contaCompartilhadaId, situacao: 'ATIVO' },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            perfil: { select: { fotoUrl: true } },
          },
        },
      },
      orderBy: { entrouEm: 'asc' },
    });

    return linhas.map((linha) => ({
      ...linha,
      usuario: {
        id: linha.usuario.id,
        nome: linha.usuario.nome,
        email: linha.usuario.email,
        fotoUrl: linha.usuario.perfil?.fotoUrl ?? null,
      },
    }));
  }

  async contarAtivos(contaCompartilhadaId: string): Promise<number> {
    return prisma.membroCompartilhado.count({
      where: { contaCompartilhadaId, situacao: 'ATIVO' },
    });
  }

  async listarGruposAtivosPorUsuario(
    usuarioId: string,
  ): Promise<{ contaCompartilhadaId: string; papel: PapelMembro }[]> {
    return prisma.membroCompartilhado.findMany({
      where: { usuarioId, situacao: 'ATIVO' },
      select: { contaCompartilhadaId: true, papel: true },
    });
  }
}
