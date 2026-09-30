import { PrismaClient } from '@prisma/client';
import { seedCategoriasPadrao } from './seed-categorias';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await seedCategoriasPadrao(prisma);
  console.log('Categorias padrao do sistema seedadas.');

  if (process.env.NODE_ENV === 'production') {
    console.log('NODE_ENV=production: dados de desenvolvimento nao serao criados.');
    return;
  }

  // Dados de desenvolvimento (usuarios demo, contas, movimentacoes,
  // cartoes, grupos, metas, orcamentos — 03-DATABASE.md §10.2) chegam
  // incrementalmente conforme as entidades correspondentes existem;
  // nesta Milestone (M2) so Usuario, Perfil, Conta e Categoria estao
  // prontos.
}

main()
  .catch((erro: unknown) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
