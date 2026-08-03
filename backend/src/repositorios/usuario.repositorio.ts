import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { Perfil, Usuario } from '@prisma/client';

export interface DadosCriarUsuario {
  nome: string;
  email: string;
  senhaHash: string;
  tokenVerificacao: string;
  tokenVerificacaoExpiraEm: Date;
}

export type UsuarioComPerfil = Usuario & { perfil: Perfil | null };

export class UsuarioRepositorio {
  async buscarPorEmail(email: string): Promise<UsuarioComPerfil | null> {
    return prisma.usuario.findFirst({
      where: { email, excluidoEm: null },
      include: { perfil: true },
    });
  }

  async buscarPorId(id: string): Promise<UsuarioComPerfil | null> {
    return prisma.usuario.findFirst({ where: { id, excluidoEm: null }, include: { perfil: true } });
  }

  /** Usuario + Perfil (com os padroes do schema) em uma unica escrita
   * atomica — o create aninhado do Prisma cobre as duas tabelas. */
  async criar(dados: DadosCriarUsuario, tx?: Prisma.TransactionClient): Promise<Usuario> {
    return (tx ?? prisma).usuario.create({
      data: { ...dados, perfil: { create: {} } },
    });
  }

  /** RN-54: incrementa o contador de tentativas falhas; quem decide
   * bloquear (ao atingir o limite) e o servico. */
  async registrarTentativaFalha(id: string): Promise<Usuario> {
    return prisma.usuario.update({
      where: { id },
      data: { tentativasLogin: { increment: 1 } },
    });
  }

  async bloquear(id: string, ate: Date): Promise<void> {
    await prisma.usuario.update({
      where: { id },
      data: { bloqueadoAte: ate, tentativasLogin: 0 },
    });
  }

  async registrarLoginSucesso(id: string): Promise<void> {
    await prisma.usuario.update({
      where: { id },
      data: { tentativasLogin: 0, bloqueadoAte: null, ultimoLoginEm: new Date() },
    });
  }
}
