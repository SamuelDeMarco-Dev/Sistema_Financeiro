import { describe, expect, it } from 'vitest';
import { comparar, gerarHash } from '@/utilitarios/senha';

describe('utilitarios/senha', () => {
  it('gera um hash diferente do texto original', async () => {
    const hash = await gerarHash('SenhaForte@2026');

    expect(hash).not.toBe('SenhaForte@2026');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('comparar retorna true para a senha correta', async () => {
    const hash = await gerarHash('SenhaForte@2026');

    await expect(comparar('SenhaForte@2026', hash)).resolves.toBe(true);
  });

  it('comparar retorna false para a senha incorreta', async () => {
    const hash = await gerarHash('SenhaForte@2026');

    await expect(comparar('OutraSenha@2026', hash)).resolves.toBe(false);
  });

  it('dois hashes da mesma senha sao diferentes entre si (salt aleatorio)', async () => {
    const [hash1, hash2] = await Promise.all([
      gerarHash('SenhaForte@2026'),
      gerarHash('SenhaForte@2026'),
    ]);

    expect(hash1).not.toBe(hash2);
  });
});
