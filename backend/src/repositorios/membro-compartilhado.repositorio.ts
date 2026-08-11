import { prisma } from '@/banco/cliente';
import type { MembroCompartilhado, PapelMembro, Prisma } from '@prisma/client';

interface LinhaMembroComUsuario extends MembroCompartilhado {
  usuario: { id: string; nome: string; email: string; perfil: { fotoUrl: string | null } | null };
}

export type MembroComUsuario = MembroCompartilhado & {
  usuario: { id: string; nome: string; email: string; fotoUrl: string | null };
};

const INCLUDE_USUARIO_COM_FOTO = {
  usuario: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: { select: { fotoUrl: true } },
    },
  },
} satisfies Prisma.MembroCompartilhadoInclude;

function paraMembroComUsuario(linha: LinhaMembroComUsuario): MembroComUsuario {
  return {
    ...linha,
    usuario: {
      id: linha.usuario.id,
      nome: linha.usuario.nome,
      email: linha.usuario.email,
      fotoUrl: linha.usuario.perfil?.fotoUrl ?? null,
    },
  };
}

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
      include: INCLUDE_USUARIO_COM_FOTO,
      orderBy: { entrouEm: 'asc' },
    });

    return linhas.map(paraMembroComUsuario);
  }

  async buscarComUsuarioPorId(membroId: string): Promise<MembroComUsuario | null> {
    const linha: LinhaMembroComUsuario | null = await prisma.membroCompartilhado.findUnique({
      where: { id: membroId },
      include: INCLUDE_USUARIO_COM_FOTO,
    });
    return linha ? paraMembroComUsuario(linha) : null;
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

  /** RF-56/RF-57 (issue #69): o `membroId` do path so e valido se pertencer
   * ao mesmo grupo e estiver ATIVO — um membro de outro grupo, ou ja
   * removido, e tratado como inexistente (RN-51). */
  async buscarAtivoPorId(
    contaCompartilhadaId: string,
    membroId: string,
  ): Promise<MembroCompartilhado | null> {
    return prisma.membroCompartilhado.findFirst({
      where: { id: membroId, contaCompartilhadaId, situacao: 'ATIVO' },
    });
  }

  async atualizarPapel(membroId: string, papel: PapelMembro): Promise<MembroCompartilhado> {
    return prisma.membroCompartilhado.update({ where: { id: membroId }, data: { papel } });
  }

  /** RN-34: a movimentacao permanece, atribuida ao usuario original — so o
   * vinculo com o grupo muda de situacao, nunca a autoria historica. */
  async marcarRemovido(membroId: string): Promise<void> {
    await prisma.membroCompartilhado.update({
      where: { id: membroId },
      data: { situacao: 'REMOVIDO', saiuEm: new Date() },
    });
  }

  async marcarSaiu(membroId: string): Promise<void> {
    await prisma.membroCompartilhado.update({
      where: { id: membroId },
      data: { situacao: 'SAIU', saiuEm: new Date() },
    });
  }

  /** RN-28: a demissao do administrador atual precisa ser gravada ANTES da
   * promocao do novo — do contrario, o `INSERT`/`UPDATE` que promove o
   * novo colide com `uq_grupo_um_administrador` (dois ADMINISTRADOR
   * ATIVO ao mesmo tempo), mesmo dentro da mesma transacao. */
  async transferirAdministracao(
    membroAntigoId: string,
    membroNovoId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ antigo: MembroCompartilhado; novo: MembroCompartilhado }> {
    const antigo = await tx.membroCompartilhado.update({
      where: { id: membroAntigoId },
      data: { papel: 'PARTICIPANTE' },
    });
    const novo = await tx.membroCompartilhado.update({
      where: { id: membroNovoId },
      data: { papel: 'ADMINISTRADOR' },
    });
    return { antigo, novo };
  }
}
