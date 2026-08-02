import { prisma } from '@/banco/cliente';

/** Ordem inversa as FKs (filhos antes dos pais). Chamar em beforeEach de
 * testes de integracao que tocam o banco real (DATABASE_URL de teste). */
export async function limparBanco(): Promise<void> {
  await prisma.$transaction([prisma.tokenRenovacao.deleteMany(), prisma.perfil.deleteMany()]);
  await prisma.usuario.deleteMany();
}
