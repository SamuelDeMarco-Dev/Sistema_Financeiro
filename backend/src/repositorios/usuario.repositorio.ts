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

  async buscarPorTokenVerificacao(token: string): Promise<UsuarioComPerfil | null> {
    return prisma.usuario.findFirst({
      where: { tokenVerificacao: token, excluidoEm: null },
      include: { perfil: true },
    });
  }

  async buscarPorTokenRecuperacao(token: string): Promise<UsuarioComPerfil | null> {
    return prisma.usuario.findFirst({
      where: { tokenRecuperacao: token, excluidoEm: null },
      include: { perfil: true },
    });
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

  /** RF-02: token de uso unico invalidado no proprio consumo. */
  async confirmarEmail(id: string): Promise<void> {
    await prisma.usuario.update({
      where: { id },
      data: {
        emailVerificadoEm: new Date(),
        tokenVerificacao: null,
        tokenVerificacaoExpiraEm: null,
      },
    });
  }

  async definirTokenVerificacao(id: string, token: string, expiraEm: Date): Promise<void> {
    await prisma.usuario.update({
      where: { id },
      data: { tokenVerificacao: token, tokenVerificacaoExpiraEm: expiraEm },
    });
  }

  async definirTokenRecuperacao(id: string, token: string, expiraEm: Date): Promise<void> {
    await prisma.usuario.update({
      where: { id },
      data: { tokenRecuperacao: token, tokenRecuperacaoExpiraEm: expiraEm },
    });
  }

  /** RF-07: troca a senha e invalida o token de recuperacao no mesmo
   * update — uso unico. */
  async redefinirSenha(
    id: string,
    senhaHash: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await (tx ?? prisma).usuario.update({
      where: { id },
      data: { senhaHash, tokenRecuperacao: null, tokenRecuperacaoExpiraEm: null },
    });
  }

  /** RF-08: alteracao de senha autenticada — sem token para invalidar. */
  async atualizarSenha(
    id: string,
    senhaHash: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await (tx ?? prisma).usuario.update({ where: { id }, data: { senhaHash } });
  }
}
