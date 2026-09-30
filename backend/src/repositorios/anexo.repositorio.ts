import { prisma } from '@/banco/cliente';
import type { Anexo } from '@prisma/client';

export interface DadosCriarAnexo {
  movimentacaoId: string;
  usuarioId: string;
  nomeOriginal: string;
  nomeArmazenado: string;
  caminho: string;
  tipoMime: string;
  tamanhoBytes: number;
}

export class AnexoRepositorio {
  async contarPorMovimentacao(movimentacaoId: string): Promise<number> {
    return prisma.anexo.count({ where: { movimentacaoId } });
  }

  /** Um `create` por arquivo (nao `createMany`) porque precisamos do `id`
   * gerado de volta para montar a resposta — `createMany` do Postgres via
   * Prisma nao devolve as linhas criadas sem uma sintaxe separada. */
  async criarVarios(dados: DadosCriarAnexo[]): Promise<Anexo[]> {
    return Promise.all(dados.map((item) => prisma.anexo.create({ data: item })));
  }

  /** RN-51: filtra por `usuarioId` (denormalizado no proprio Anexo) e pela
   * movimentacao nao estar excluida — um anexo de movimentacao apagada nao
   * deveria mais ser baixavel, mesmo que a limpeza em lote ainda nao tenha
   * corrido. */
  async buscarPorId(id: string, usuarioId: string): Promise<Anexo | null> {
    return prisma.anexo.findFirst({
      where: { id, usuarioId, movimentacao: { excluidoEm: null } },
    });
  }

  async excluir(id: string): Promise<void> {
    await prisma.anexo.delete({ where: { id } });
  }

  async listarPorMovimentacoes(movimentacaoIds: string[]): Promise<Anexo[]> {
    if (movimentacaoIds.length === 0) return [];
    return prisma.anexo.findMany({ where: { movimentacaoId: { in: movimentacaoIds } } });
  }

  async excluirPorMovimentacoes(movimentacaoIds: string[]): Promise<void> {
    if (movimentacaoIds.length === 0) return;
    await prisma.anexo.deleteMany({ where: { movimentacaoId: { in: movimentacaoIds } } });
  }
}
