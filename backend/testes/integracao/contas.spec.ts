import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';

const app = criarServidor();

const SENHA_VALIDA = 'SenhaForte@2026';
let contadorEmail = 0;

async function criarUsuarioAutenticado(): Promise<{ usuarioId: string; accessToken: string }> {
  contadorEmail += 1;
  const email = `contas-${contadorEmail}@exemplo.com`;

  await request(app)
    .post('/api/v1/autenticacao/cadastrar')
    .send({ nome: 'Samuel De Marco', email, senha: SENHA_VALIDA, confirmacaoSenha: SENHA_VALIDA });
  await prisma.usuario.update({ where: { email }, data: { emailVerificadoEm: new Date() } });
  const login = await request(app)
    .post('/api/v1/autenticacao/entrar')
    .send({ email, senha: SENHA_VALIDA });
  const corpo = login.body as { data: { accessToken: string; usuario: { id: string } } };
  return { usuarioId: corpo.data.usuario.id, accessToken: corpo.data.accessToken };
}

describe('/api/v1/contas', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('cria uma conta e o saldo inicial e igual ao saldoInicial informado', async () => {
    const { accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Banco Principal', tipo: 'CONTA_CORRENTE', saldoInicial: '3500.00' });

    expect(resposta.status).toBe(201);
    expect(resposta.headers.location).toBe(
      `/api/v1/contas/${(resposta.body as { data: { conta: { id: string } } }).data.conta.id}`,
    );
    const { conta } = (
      resposta.body as { data: { conta: { saldoAtual: string; saldoInicial: string } } }
    ).data;
    expect(conta.saldoAtual).toBe('3500.00');
    expect(conta.saldoInicial).toBe('3500.00');
  });

  it('rejeita nome duplicado no mesmo escopo com 409', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Carteira', tipo: 'CARTEIRA' });

    const resposta = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'carteira', tipo: 'CARTEIRA' });

    expect(resposta.status).toBe(409);
    expect((resposta.body as { codigo: string }).codigo).toBe('CONFLITO');
  });

  it('lista as contas com saldoTotal nos totalizadores', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Banco Principal', tipo: 'CONTA_CORRENTE', saldoInicial: '1000.00' });
    await request(app).post('/api/v1/contas').set('Authorization', `Bearer ${accessToken}`).send({
      nome: 'Poupança',
      tipo: 'POUPANCA',
      saldoInicial: '500.00',
      incluirNoSaldoTotal: false,
    });

    const resposta = await request(app)
      .get('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(200);
    const corpo = resposta.body as {
      data: { contas: unknown[] };
      meta: { totalizadores: { saldoTotal: string; quantidadeContas: number } };
    };
    expect(corpo.data.contas).toHaveLength(2);
    expect(corpo.meta.totalizadores.saldoTotal).toBe('1000.00');
    expect(corpo.meta.totalizadores.quantidadeContas).toBe(2);
  });

  it('responde 404 (nao 403) ao buscar conta de outro usuario', async () => {
    const dono = await criarUsuarioAutenticado();
    const outro = await criarUsuarioAutenticado();
    const criada = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${dono.accessToken}`)
      .send({ nome: 'Conta do Dono', tipo: 'CARTEIRA' });
    const idConta = (criada.body as { data: { conta: { id: string } } }).data.conta.id;

    const resposta = await request(app)
      .get(`/api/v1/contas/${idConta}`)
      .set('Authorization', `Bearer ${outro.accessToken}`);

    expect(resposta.status).toBe(404);
  });

  it('arquiva e desarquiva uma conta', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const criada = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Carteira', tipo: 'CARTEIRA' });
    const idConta = (criada.body as { data: { conta: { id: string } } }).data.conta.id;

    const arquivada = await request(app)
      .patch(`/api/v1/contas/${idConta}/arquivar`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(
      (arquivada.body as { data: { conta: { arquivada: boolean } } }).data.conta.arquivada,
    ).toBe(true);

    const desarquivada = await request(app)
      .patch(`/api/v1/contas/${idConta}/desarquivar`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(
      (desarquivada.body as { data: { conta: { arquivada: boolean } } }).data.conta.arquivada,
    ).toBe(false);
  });

  it('reordena contas em lote', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const c1 = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Conta 1', tipo: 'CARTEIRA' });
    const c2 = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Conta 2', tipo: 'CARTEIRA' });
    const id1 = (c1.body as { data: { conta: { id: string } } }).data.conta.id;
    const id2 = (c2.body as { data: { conta: { id: string } } }).data.conta.id;

    const resposta = await request(app)
      .patch('/api/v1/contas/reordenar')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ordens: [
          { id: id2, ordem: 0 },
          { id: id1, ordem: 1 },
        ],
      });
    expect(resposta.status).toBe(200);

    const listagem = await request(app)
      .get('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`);
    const contas = (listagem.body as { data: { contas: { id: string; ordem: number }[] } }).data
      .contas;
    expect(contas.find((c) => c.id === id2)?.ordem).toBe(0);
    expect(contas.find((c) => c.id === id1)?.ordem).toBe(1);
  });

  it('exclui uma conta sem movimentacoes com 204', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const criada = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Descartavel', tipo: 'CARTEIRA' });
    const idConta = (criada.body as { data: { conta: { id: string } } }).data.conta.id;

    const resposta = await request(app)
      .delete(`/api/v1/contas/${idConta}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(resposta.status).toBe(204);

    const buscaApos = await request(app)
      .get(`/api/v1/contas/${idConta}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(buscaApos.status).toBe(404);
  });

  it('conta excluida logicamente libera o nome para reuso', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const criada = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Reutilizavel', tipo: 'CARTEIRA' });
    const idConta = (criada.body as { data: { conta: { id: string } } }).data.conta.id;
    await request(app)
      .delete(`/api/v1/contas/${idConta}`)
      .set('Authorization', `Bearer ${accessToken}`);

    const recriada = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Reutilizavel', tipo: 'CARTEIRA' });

    expect(recriada.status).toBe(201);
  });

  it('GET /contas/resumo devolve a versao enxuta sem agregacoes', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Carteira', tipo: 'CARTEIRA' });

    const resposta = await request(app)
      .get('/api/v1/contas/resumo')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(200);
    const contas = (resposta.body as { data: { contas: Record<string, unknown>[] } }).data.contas;
    expect(contas[0]).toEqual(
      expect.objectContaining({ nome: 'Carteira', tipo: 'CARTEIRA' }) as unknown,
    );
    expect(contas[0]).not.toHaveProperty('saldoAtual');
  });

  it('todas as rotas exigem autenticacao', async () => {
    const resposta = await request(app).get('/api/v1/contas');
    expect(resposta.status).toBe(401);
  });
});
