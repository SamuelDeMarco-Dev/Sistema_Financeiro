import { prisma } from '@/banco/cliente';
import type { Etiqueta, Prisma } from '@prisma/client';

export interface DadosEtiqueta {
  nome: string;
  cor: string;
}

export class EtiquetaRepositorio {
  async listarPorUsuario(usuarioId: string): Promise<Etiqueta[]> {
    return prisma.etiqueta.findMany({ where: { usuarioId }, orderBy: { nome: 'asc' } });
  }

  async buscarPorId(id: string, usuarioId: string): Promise<Etiqueta | null> {
    return prisma.etiqueta.findFirst({ where: { id, usuarioId } });
  }

  async criar(usuarioId: string, dados: DadosEtiqueta): Promise<Etiqueta> {
    return prisma.etiqueta.create({ data: { usuarioId, ...dados } });
  }

  async atualizar(id: string, dados: Prisma.EtiquetaUpdateInput): Promise<Etiqueta> {
    return prisma.etiqueta.update({ where: { id }, data: dados });
  }

  /** RF-33: exclusao real (nao ha `excluidoEm` em Etiqueta) — o vinculo
   * com movimentacoes usa onDelete: Cascade, entao some junto sem tocar
   * na movimentacao em si. */
  async excluir(id: string): Promise<void> {
    await prisma.etiqueta.delete({ where: { id } });
  }

  /** M2: `MovimentacaoEtiqueta` ainda nao existe (chega em M3, issue #32)
   * — nenhuma etiqueta pode estar em uso ainda, entao a contagem e
   * sempre zero. */
  // eslint-disable-next-line @typescript-eslint/require-await -- assinatura assincrona preparada para a consulta real em M3.
  async contarUso(_id: string): Promise<number> {
    return 0;
  }
}
