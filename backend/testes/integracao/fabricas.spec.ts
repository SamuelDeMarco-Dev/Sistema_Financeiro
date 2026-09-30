import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { verificarAccessToken } from '@/utilitarios/jwt';
import { limparBanco } from '../configuracao/banco-teste';
import {
  fabricarCategoria,
  fabricarConta,
  fabricarEtiqueta,
  fabricarMovimentacao,
  fabricarTransferencia,
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

  it('fabricarMovimentacao cria uma movimentacao pertencente a usuario e conta', async () => {
    const { usuario, conta } = await prepararUsuarioComConta();
    const movimentacao = await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '250.00',
      situacao: 'PAGA',
    });

    expect(movimentacao.usuarioId).toBe(usuario.id);
    expect(movimentacao.contaId).toBe(conta.id);
    expect(movimentacao.tipo).toBe('RECEITA');
    expect(movimentacao.valor.toFixed(2)).toBe('250.00');
    expect(movimentacao.valorPago.toFixed(2)).toBe('250.00');
    expect(movimentacao.dataEfetivacao).not.toBeNull();
  });

  it('fabricarTransferencia cria o par SAIDA/ENTRADA vinculado por transferenciaId', async () => {
    const { usuario, conta: origem } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Destino' });

    const transferenciaId = await fabricarTransferencia(usuario.id, origem.id, destino.id, {
      valor: '75.00',
    });

    const pernas = await prisma.movimentacao.findMany({ where: { transferenciaId } });
    expect(pernas).toHaveLength(2);
    expect(pernas.map((perna) => perna.sentido).sort()).toEqual(['ENTRADA', 'SAIDA']);
    expect(pernas.every((perna) => perna.valor.toFixed(2) === '75.00')).toBe(true);
  });
});
