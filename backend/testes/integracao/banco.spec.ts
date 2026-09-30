import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { limparBanco } from '../configuracao/banco-teste';

const UM_DIA_MS = 1000 * 60 * 60 * 24;

describe('banco: Usuario, Perfil, TokenRenovacao', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('cria um usuario com perfil relacionado 1:1, com os padroes do Perfil', async () => {
    const usuario = await prisma.usuario.create({
      data: {
        nome: 'Usuaria de Teste',
        email: 'usuaria@exemplo.com',
        senhaHash: 'hash-fake',
        perfil: { create: {} },
      },
      include: { perfil: true },
    });

    expect(usuario.perfil).not.toBeNull();
    expect(usuario.perfil?.usuarioId).toBe(usuario.id);
    expect(usuario.perfil?.tema).toBe('SISTEMA');
    expect(usuario.perfil?.moedaPadrao).toBe('BRL');
    expect(usuario.perfil?.timezone).toBe('America/Sao_Paulo');
  });

  it('exclui o perfil em cascata quando o usuario e excluido', async () => {
    const usuario = await prisma.usuario.create({
      data: {
        nome: 'Outra Usuaria',
        email: 'outra@exemplo.com',
        senhaHash: 'hash-fake',
        perfil: { create: {} },
      },
    });

    await prisma.usuario.delete({ where: { id: usuario.id } });

    const perfil = await prisma.perfil.findUnique({ where: { usuarioId: usuario.id } });
    expect(perfil).toBeNull();
  });

  it('exclui tokens de renovacao em cascata quando o usuario e excluido', async () => {
    const usuario = await prisma.usuario.create({
      data: { nome: 'Terceira Usuaria', email: 'terceira@exemplo.com', senhaHash: 'hash-fake' },
    });
    await prisma.tokenRenovacao.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: 'hash-do-token',
        expiraEm: new Date(Date.now() + 7 * UM_DIA_MS),
      },
    });

    await prisma.usuario.delete({ where: { id: usuario.id } });

    const tokens = await prisma.tokenRenovacao.findMany({ where: { usuarioId: usuario.id } });
    expect(tokens).toHaveLength(0);
  });

  it('limparBanco() esvazia usuarios, perfis e tokens sem violar FK', async () => {
    const usuario = await prisma.usuario.create({
      data: {
        nome: 'Para Limpar',
        email: 'limpar@exemplo.com',
        senhaHash: 'hash-fake',
        perfil: { create: {} },
      },
    });
    await prisma.tokenRenovacao.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: 'outro-hash-do-token',
        expiraEm: new Date(Date.now() + 7 * UM_DIA_MS),
      },
    });

    await expect(limparBanco()).resolves.toBeUndefined();

    await expect(prisma.usuario.count()).resolves.toBe(0);
    await expect(prisma.perfil.count()).resolves.toBe(0);
    await expect(prisma.tokenRenovacao.count()).resolves.toBe(0);
  });
});
