import { prisma } from '@/banco/cliente';
import { seedCategoriasPadrao } from '../../prisma/seed-categorias';

/** Ordem inversa as FKs (filhos antes dos pais). Chamar em beforeEach de
 * testes de integracao que tocam o banco real (DATABASE_URL de teste).
 * Preserva as categorias padrao do sistema (`ehPadraoSistema: true`) —
 * elas nao pertencem a nenhum teste especifico, sao dado de referencia
 * compartilhado (ver `garantirCategoriasPadrao`). */
export async function limparBanco(): Promise<void> {
  await prisma.$transaction([
    // Movimentacao usa onDelete: Restrict em usuario/conta/categoria — os
    // vinculos e a propria movimentacao precisam sair antes desses pais.
    prisma.movimentacaoEtiqueta.deleteMany(),
    prisma.anexo.deleteMany(),
    prisma.movimentacao.deleteMany(),
    prisma.compraParcelada.deleteMany(),
    prisma.tokenRenovacao.deleteMany(),
    prisma.perfil.deleteMany(),
    prisma.etiqueta.deleteMany(),
    // Subcategorias antes das raizes — categoriaPai usa onDelete: Restrict.
    prisma.categoria.deleteMany({
      where: { categoriaPaiId: { not: null }, ehPadraoSistema: false },
    }),
    prisma.categoria.deleteMany({ where: { ehPadraoSistema: false } }),
    prisma.conta.deleteMany(),
  ]);
  await prisma.usuario.deleteMany();
}

/** Garante que as categorias padrao do sistema existem no banco de teste
 * — idempotente, chamar em `beforeAll` de qualquer suite que exercite
 * RF-19 (cadastro copiando as categorias, listagem incluindo padrao). */
export async function garantirCategoriasPadrao(): Promise<void> {
  await seedCategoriasPadrao(prisma);
}
