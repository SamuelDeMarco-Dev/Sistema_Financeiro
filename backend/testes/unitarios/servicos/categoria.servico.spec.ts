import { describe, expect, it } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { CategoriaRepositorio } from '@/repositorios/categoria.repositorio';
import { CategoriaServico } from '@/servicos/categoria.servico';
import type { Prisma } from '@prisma/client';

describe('CategoriaServico', () => {
  it('copiarPadraoParaUsuario delega ao repositorio com o mesmo usuarioId e tx', async () => {
    const repositorio: MockProxy<CategoriaRepositorio> = mock();
    const servico = new CategoriaServico(repositorio);
    const tx = {} as Prisma.TransactionClient;

    await servico.copiarPadraoParaUsuario('usuario-1', tx);

    expect(repositorio.copiarPadraoParaUsuario).toHaveBeenCalledWith('usuario-1', tx);
  });
});
