import type { Prisma } from '@prisma/client';

export class CategoriaRepositorio {
  /** RF-19: copia as categorias padrao do sistema (raiz + subcategorias)
   * para o usuario recem-cadastrado, preservando a hierarquia pai/filho.
   * Roda dentro da transacao de cadastro (issue #11) — falha do cadastro
   * nunca deixa um usuario sem categorias, nem vice-versa. */
  async copiarPadraoParaUsuario(usuarioId: string, tx: Prisma.TransactionClient): Promise<void> {
    const raizes = await tx.categoria.findMany({
      where: { ehPadraoSistema: true, categoriaPaiId: null },
      include: { subcategorias: { where: { ehPadraoSistema: true }, orderBy: { ordem: 'asc' } } },
      orderBy: { ordem: 'asc' },
    });

    for (const raiz of raizes) {
      const novaRaiz = await tx.categoria.create({
        data: {
          usuarioId,
          nome: raiz.nome,
          tipo: raiz.tipo,
          cor: raiz.cor,
          icone: raiz.icone,
          ordem: raiz.ordem,
        },
      });

      if (raiz.subcategorias.length > 0) {
        await tx.categoria.createMany({
          data: raiz.subcategorias.map((sub) => ({
            usuarioId,
            nome: sub.nome,
            tipo: sub.tipo,
            cor: sub.cor,
            icone: sub.icone,
            ordem: sub.ordem,
            categoriaPaiId: novaRaiz.id,
          })),
        });
      }
    }
  }
}
