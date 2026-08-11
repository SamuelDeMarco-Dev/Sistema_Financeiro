import { prisma } from '@/banco/cliente';
import type { Convite, PapelMembro, Prisma, SituacaoConvite } from '@prisma/client';

export interface DadosCriarConvite {
  contaCompartilhadaId: string;
  email: string;
  papel: PapelMembro;
  mensagem: string | null;
  token: string;
  enviadoPorId: string;
  usuarioConvidadoId: string | null;
  expiraEm: Date;
}

export type ConviteComGrupo = Convite & {
  contaCompartilhada: { id: string; nome: string; imagemUrl: string | null };
  enviadoPor: { id: string; nome: string };
};

const INCLUDE_GRUPO_E_REMETENTE = {
  contaCompartilhada: { select: { id: true, nome: true, imagemUrl: true } },
  enviadoPor: { select: { id: true, nome: true } },
} satisfies Prisma.ConviteInclude;

export class ConviteRepositorio {
  async criar(dados: DadosCriarConvite): Promise<Convite> {
    return prisma.convite.create({ data: dados });
  }

  /** RN-36: complementa o indice unico parcial `uq_convite_pendente` — o
   * servico consulta aqui para devolver um 409 amigavel; o indice segue
   * sendo a garantia real contra corrida (dois convites simultaneos). */
  async buscarPendentePorEmailEGrupo(
    contaCompartilhadaId: string,
    email: string,
  ): Promise<Convite | null> {
    return prisma.convite.findFirst({
      where: {
        contaCompartilhadaId,
        email: { equals: email, mode: 'insensitive' },
        situacao: 'PENDENTE',
      },
    });
  }

  async buscarPorId(id: string): Promise<ConviteComGrupo | null> {
    return prisma.convite.findUnique({ where: { id }, include: INCLUDE_GRUPO_E_REMETENTE });
  }

  async buscarPorToken(token: string): Promise<ConviteComGrupo | null> {
    return prisma.convite.findUnique({ where: { token }, include: INCLUDE_GRUPO_E_REMETENTE });
  }

  async listarPorGrupo(contaCompartilhadaId: string): Promise<ConviteComGrupo[]> {
    return prisma.convite.findMany({
      where: { contaCompartilhadaId },
      include: INCLUDE_GRUPO_E_REMETENTE,
      orderBy: { criadoEm: 'desc' },
    });
  }

  /** RN-37: convites enviados antes do cadastro (usuarioConvidadoId nulo)
   * tambem aparecem — casados aqui pelo e-mail, nao pelo id. */
  async listarRecebidosPorEmail(email: string): Promise<ConviteComGrupo[]> {
    return prisma.convite.findMany({
      where: { email: { equals: email, mode: 'insensitive' }, situacao: 'PENDENTE' },
      include: INCLUDE_GRUPO_E_REMETENTE,
      orderBy: { criadoEm: 'desc' },
    });
  }

  async atualizarSituacao(
    id: string,
    situacao: SituacaoConvite,
    tx?: Prisma.TransactionClient,
  ): Promise<Convite> {
    return (tx ?? prisma).convite.update({
      where: { id },
      data: { situacao, respondidoEm: new Date() },
    });
  }

  /** Tarefa `limpar-tokens` (issue #70/RN-35): convites pendentes cuja
   * validade passou nunca mais podem ser aceitos — marcar EXPIRADO os
   * torna visiveis como historico, em vez de remove-los. */
  async marcarExpirados(agora: Date): Promise<number> {
    const resultado = await prisma.convite.updateMany({
      where: { situacao: 'PENDENTE', expiraEm: { lt: agora } },
      data: { situacao: 'EXPIRADO' },
    });
    return resultado.count;
  }
}
