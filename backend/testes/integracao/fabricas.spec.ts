import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { verificarAccessToken } from '@/utilitarios/jwt';
import { limparBanco } from '../configuracao/banco-teste';
import {
  fabricarCategoria,
  fabricarConta,
  fabricarEtiqueta,
  fabricarUsuario,
  prepararUsuarioComConta,
} from '../fabricas';

describe('testes/fabricas', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('fabricarUsuario cria um usuario verificado com access token valido', async () => {
    const { usuario, accessToken } = await fabricarUsuario();

    expect(usuario.emailVerificadoEm).not.toBeNull();
    expect(verificarAccessToken(accessToken)).toMatchObject({ sub: usuario.id });
  });

  it('fabricarConta cria uma conta pertencente ao usuario', async () => {
    const { usuario } = await fabricarUsuario();
    const conta = await fabricarConta(usuario.id, { nome: 'Carteira' });

    expect(conta.usuarioId).toBe(usuario.id);
    expect(conta.nome).toBe('Carteira');
  });

  it('fabricarCategoria cria uma categoria pertencente ao usuario', async () => {
    const { usuario } = await fabricarUsuario();
    const categoria = await fabricarCategoria(usuario.id, { tipo: 'RECEITA' });

    expect(categoria.usuarioId).toBe(usuario.id);
    expect(categoria.tipo).toBe('RECEITA');
  });

  it('fabricarEtiqueta cria uma etiqueta pertencente ao usuario', async () => {
    const { usuario } = await fabricarUsuario();
    const etiqueta = await fabricarEtiqueta(usuario.id, { nome: 'viagem' });

    expect(etiqueta.usuarioId).toBe(usuario.id);
    expect(etiqueta.nome).toBe('viagem');
  });

  it('prepararUsuarioComConta devolve token, conta e categoria do mesmo usuario', async () => {
    const { usuario, accessToken, conta, categoria } = await prepararUsuarioComConta();

    expect(verificarAccessToken(accessToken).sub).toBe(usuario.id);
    expect(conta.usuarioId).toBe(usuario.id);
    expect(categoria.usuarioId).toBe(usuario.id);
  });
});
