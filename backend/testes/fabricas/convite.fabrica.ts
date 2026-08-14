import { randomBytes } from 'node:crypto';
import { prisma } from '@/banco/cliente';
import type { Convite, PapelMembro, SituacaoConvite } from '@prisma/client';

const DIAS_EXPIRACAO_CONVITE = 7;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

export interface SobrescritasConvite {
  email?: string;
  papel?: PapelMembro;
  situacao?: SituacaoConvite;
  expiraEm?: Date;
  respondidoEm?: Date | null;
  usuarioConvidadoId?: string | null;
  mensagem?: string | null;
}

/** Cria um convite direto no banco (sem passar pelo fluxo de envio de
 * e-mail) — usada pela matriz de autorizacao (issue #77) e por testes
 * de ciclo de vida que precisam de um convite em uma situacao/expiracao
 * especifica sem depender do relogio real. */
export async function fabricarConvite(
  contaCompartilhadaId: string,
  enviadoPorId: string,
  sobrescritas: SobrescritasConvite = {},
): Promise<Convite> {
  const token = randomBytes(32).toString('hex');
  const expiraEm =
    sobrescritas.expiraEm ?? new Date(Date.now() + DIAS_EXPIRACAO_CONVITE * UM_DIA_MS);

  return prisma.convite.create({
    data: {
      contaCompartilhadaId,
      enviadoPorId,
      email: sobrescritas.email ?? `convidado-${token.slice(0, 8)}@exemplo.com`,
      papel: sobrescritas.papel ?? 'PARTICIPANTE',
      situacao: sobrescritas.situacao ?? 'PENDENTE',
      token,
      expiraEm,
      respondidoEm: sobrescritas.respondidoEm ?? null,
      usuarioConvidadoId: sobrescritas.usuarioConvidadoId ?? null,
      mensagem: sobrescritas.mensagem ?? null,
    },
  });
}
