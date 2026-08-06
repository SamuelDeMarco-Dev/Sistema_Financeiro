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

  async contarUso(id: string): Promise<number> {
    return prisma.movimentacaoEtiqueta.count({
      where: { etiquetaId: id, movimentacao: { excluidoEm: null } },
    });
  }

  /** RF-33: valida propriedade de todas as etiquetas de uma vez — usado
   * ao vincular etiquetas a uma movimentacao (issue #34). */
  async listarPorIds(ids: string[], usuarioId: string): Promise<Etiqueta[]> {
    return prisma.etiqueta.findMany({ where: { id: { in: ids }, usuarioId } });
  }
}
