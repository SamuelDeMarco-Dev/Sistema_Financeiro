import { prisma } from '@/banco/cliente';

interface LinhaMigracao {
  migration_name: string;
}

/** `SELECT 1` simples: nao depende de nenhum modelo existir no schema,
 * apenas de o Postgres aceitar conexoes. Lanca se a conexao falhar. */
export async function verificarConexaoBanco(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

/** Nomes de migration com aplicacao concluida e nao revertida, conforme a
 * tabela de controle que o proprio Prisma Migrate mantem. */
export async function buscarMigrationsAplicadas(): Promise<string[]> {
  const linhas = await prisma.$queryRaw<LinhaMigracao[]>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `;

  return linhas.map((linha) => linha.migration_name);
}
