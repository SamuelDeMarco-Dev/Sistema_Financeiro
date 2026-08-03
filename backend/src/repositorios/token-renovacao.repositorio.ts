import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { TokenRenovacao, Usuario } from '@prisma/client';

export interface DadosCriarTokenRenovacao {
  usuarioId: string;
  tokenHash: string;
  dispositivo?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  expiraEm: Date;
}

export type TokenRenovacaoComUsuario = TokenRenovacao & { usuario: Usuario };

export class TokenRenovacaoRepositorio {
  async criar(
    dados: DadosCriarTokenRenovacao,
    tx?: Prisma.TransactionClient,
  ): Promise<TokenRenovacao> {
    return (tx ?? prisma).tokenRenovacao.create({ data: dados });
  }

  async buscarPorHash(tokenHash: string): Promise<TokenRenovacaoComUsuario | null> {
    return prisma.tokenRenovacao.findFirst({ where: { tokenHash }, include: { usuario: true } });
  }

  /** RN-53 (rotacao): marca o token como revogado e aponta para quem o
   * substituiu — a trilha permite reconstruir a familia inteira. */
  async revogar(
    id: string,
    substituidoPorId: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await (tx ?? prisma).tokenRenovacao.update({
      where: { id },
      data: { revogadoEm: new Date(), substituidoPorId },
    });
  }

  /** Deteccao de reuso: revoga toda a familia de tokens ainda ativos do
   * usuario (04-API.md §7.3). */
  async revogarTodosDoUsuario(usuarioId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? prisma).tokenRenovacao.updateMany({
      where: { usuarioId, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
  }
}
