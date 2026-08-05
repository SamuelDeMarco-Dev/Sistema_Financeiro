import { CategoriaRepositorio } from '@/repositorios/categoria.repositorio';
import type { Prisma } from '@prisma/client';

export class CategoriaServico {
  constructor(private readonly repositorio = new CategoriaRepositorio()) {}

  async copiarPadraoParaUsuario(usuarioId: string, tx: Prisma.TransactionClient): Promise<void> {
    await this.repositorio.copiarPadraoParaUsuario(usuarioId, tx);
  }
}
