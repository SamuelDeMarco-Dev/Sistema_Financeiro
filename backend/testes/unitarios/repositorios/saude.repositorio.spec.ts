import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/banco/cliente';
import { buscarMigrationsAplicadas, verificarConexaoBanco } from '@/repositorios/saude.repositorio';

vi.mock('@/banco/cliente', () => ({
  prisma: { $queryRaw: vi.fn() },
}));

const queryRawMockado = vi.mocked(prisma.$queryRaw);

describe('saude.repositorio', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('verificarConexaoBanco', () => {
    it('resolve sem lancar quando o banco responde', async () => {
      queryRawMockado.mockResolvedValue([{ '?column?': 1 }]);

      await expect(verificarConexaoBanco()).resolves.toBeUndefined();
    });

    it('propaga o erro quando a conexao falha', async () => {
      queryRawMockado.mockRejectedValue(new Error('Conexao recusada.'));

      await expect(verificarConexaoBanco()).rejects.toThrow('Conexao recusada.');
    });
  });

  describe('buscarMigrationsAplicadas', () => {
    it('retorna apenas os nomes das migrations concluidas', async () => {
      queryRawMockado.mockResolvedValue([
        { migration_name: '20260101000000_inicial' },
        { migration_name: '20260102000000_indices' },
      ]);

      const resultado = await buscarMigrationsAplicadas();

      expect(resultado).toEqual(['20260101000000_inicial', '20260102000000_indices']);
    });
  });
});
