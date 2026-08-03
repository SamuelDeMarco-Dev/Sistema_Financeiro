import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { TokenRenovacao } from '@prisma/client';

export interface DadosCriarTokenRenovacao {
  usuarioId: string;
  tokenHash: string;
  dispositivo?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  expiraEm: Date;
}

export class TokenRenovacaoRepositorio {
  async criar(
    dados: DadosCriarTokenRenovacao,
    tx?: Prisma.TransactionClient,
  ): Promise<TokenRenovacao> {
    return (tx ?? prisma).tokenRenovacao.create({ data: dados });
  }
}
