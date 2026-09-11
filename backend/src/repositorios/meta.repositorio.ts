import { prisma } from '@/banco/cliente';
import type { Meta, Prisma, SituacaoMeta } from '@prisma/client';

export interface DadosCriarMeta {
  nome: string;
  descricao: string | null;
  valorAlvo: Prisma.Decimal;
  prazoEm: Date | null;
  cor: string;
  icone: string;
}

export interface FiltrosListarMetas {
  situacao: SituacaoMeta[];
}

export class MetaRepositorio {
  async listar(usuarioId: string, filtros: FiltrosListarMetas): Promise<Meta[]> {
    return prisma.meta.findMany({
      where: { usuarioId, excluidoEm: null, situacao: { in: filtros.situacao } },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async listarDeGrupo(contaCompartilhadaId: string, filtros: FiltrosListarMetas): Promise<Meta[]> {
    return prisma.meta.findMany({
      where: { contaCompartilhadaId, excluidoEm: null, situacao: { in: filtros.situacao } },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async buscarPorId(id: string, usuarioId: string): Promise<Meta | null> {
    return prisma.meta.findFirst({ where: { id, usuarioId, excluidoEm: null } });
  }

  /** Sem filtro de propriedade — usado quando a autorizacao (pessoal vs.
   * grupo) e decidida pelo chamador, mesmo padrao de CategoriaRepositorio. */
  async buscarPorIdSemEscopo(id: string): Promise<Meta | null> {
    return prisma.meta.findFirst({ where: { id, excluidoEm: null } });
  }

  async criar(usuarioId: string, dados: DadosCriarMeta): Promise<Meta> {
    return prisma.meta.create({ data: { usuarioId, ...dados } });
  }

  async criarDeGrupo(contaCompartilhadaId: string, dados: DadosCriarMeta): Promise<Meta> {
    return prisma.meta.create({ data: { contaCompartilhadaId, ...dados } });
  }

  async atualizar(id: string, dados: Prisma.MetaUpdateInput): Promise<Meta> {
    return prisma.meta.update({ where: { id }, data: dados });
  }

  async excluirLogicamente(id: string): Promise<void> {
    await prisma.meta.update({ where: { id }, data: { excluidoEm: new Date() } });
  }
}
