import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { Usuario } from '@prisma/client';

export interface DadosCriarUsuario {
  nome: string;
  email: string;
  senhaHash: string;
  tokenVerificacao: string;
  tokenVerificacaoExpiraEm: Date;
}

export class UsuarioRepositorio {
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    return prisma.usuario.findFirst({ where: { email, excluidoEm: null } });
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    return prisma.usuario.findFirst({ where: { id, excluidoEm: null } });
  }

  /** Usuario + Perfil (com os padroes do schema) em uma unica escrita
   * atomica — o create aninhado do Prisma cobre as duas tabelas. */
  async criar(dados: DadosCriarUsuario, tx?: Prisma.TransactionClient): Promise<Usuario> {
    return (tx ?? prisma).usuario.create({
      data: { ...dados, perfil: { create: {} } },
    });
  }
}
