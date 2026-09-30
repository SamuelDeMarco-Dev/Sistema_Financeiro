import { CATEGORIAS_PADRAO_SISTEMA } from './dados/categorias-padrao';
import type { CategoriaPadraoSistema } from './dados/categorias-padrao';
import type { Categoria, PrismaClient, TipoCategoria } from '@prisma/client';

interface DadosCategoriaPadrao {
  nome: string;
  tipo: TipoCategoria;
  cor: string;
  icone: string;
  ordem: number;
}

// Nao ha constraint unica no banco para categorias padrao (usuario_id e
// null, fora do alcance dos indices parciais de §6) — a idempotencia e
// garantida aqui, via find-or-create.
async function encontrarOuCriarRaiz(
  prisma: PrismaClient,
  dados: DadosCategoriaPadrao,
): Promise<Categoria> {
  const existente = await prisma.categoria.findFirst({
    where: { ehPadraoSistema: true, categoriaPaiId: null, nome: dados.nome },
  });
  if (existente) return existente;

  return prisma.categoria.create({ data: { ...dados, ehPadraoSistema: true } });
}

async function encontrarOuCriarSubcategoria(
  prisma: PrismaClient,
  categoriaPaiId: string,
  dados: DadosCategoriaPadrao,
): Promise<Categoria> {
  const existente = await prisma.categoria.findFirst({
    where: { ehPadraoSistema: true, categoriaPaiId, nome: dados.nome },
  });
  if (existente) return existente;

  return prisma.categoria.create({
    data: { ...dados, categoriaPaiId, ehPadraoSistema: true },
  });
}

async function seedCategoria(
  prisma: PrismaClient,
  categoria: CategoriaPadraoSistema,
  ordem: number,
): Promise<void> {
  const raiz = await encontrarOuCriarRaiz(prisma, {
    nome: categoria.nome,
    tipo: categoria.tipo,
    cor: categoria.cor,
    icone: categoria.icone,
    ordem,
  });

  const subcategorias = categoria.subcategorias ?? [];
  for (const [indice, nome] of subcategorias.entries()) {
    await encontrarOuCriarSubcategoria(prisma, raiz.id, {
      nome,
      tipo: categoria.tipo,
      cor: categoria.cor,
      icone: categoria.icone,
      ordem: indice,
    });
  }
}

/** RF-19: cria (ou reaproveita, se ja existirem) as 18 categorias padrao
 * do sistema e suas subcategorias iniciais — idempotente, seguro para
 * rodar em todo deploy. */
export async function seedCategoriasPadrao(prisma: PrismaClient): Promise<void> {
  for (const [indice, categoria] of CATEGORIAS_PADRAO_SISTEMA.entries()) {
    await seedCategoria(prisma, categoria, indice);
  }
}
