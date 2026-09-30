import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarUsuario } from '../fabricas';

const app = criarServidor();

async function criarUsuarioAutenticado(): Promise<{ usuarioId: string; accessToken: string }> {
  const { usuario, accessToken } = await fabricarUsuario();
  return { usuarioId: usuario.id, accessToken };
}

async function criarGrupo(
  accessToken: string,
  corpo: Record<string, unknown> = {},
): Promise<{ id: string }> {
  const resposta = await request(app)
    .post('/api/v1/contas-compartilhadas')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ nome: 'Casa', criarCategoriasPadrao: false, ...corpo });
  return (resposta.body as { data: { contaCompartilhada: { id: string } } }).data
    .contaCompartilhada;
}

async function adicionarMembro(
  contaCompartilhadaId: string,
  usuarioId: string,
  papel: 'PARTICIPANTE' | 'OBSERVADOR' | 'ADMINISTRADOR',
): Promise<void> {
  await prisma.membroCompartilhado.create({ data: { contaCompartilhadaId, usuarioId, papel } });
}

async function criarSubContaDeGrupo(
  accessToken: string,
  contaCompartilhadaId: string,
  nome = 'Caixa',
): Promise<string> {
  const resposta = await request(app)
    .post('/api/v1/contas')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ nome, tipo: 'CONTA_CORRENTE', contaCompartilhadaId });
  return (resposta.body as { data: { conta: { id: string } } }).data.conta.id;
}

describe('transferencias entre escopo pessoal e de grupo (issue #73)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('RF-37: transferencia PESSOAL -> GRUPO e atomica e atualiza os dois saldos', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const carteira = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Carteira', tipo: 'CARTEIRA', saldoInicial: '500.00' });
    const carteiraId = (carteira.body as { data: { conta: { id: string } } }).data.conta.id;

    const grupo = await criarGrupo(accessToken);
    const caixaId = await criarSubContaDeGrupo(accessToken, grupo.id);

    const resposta = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: carteiraId,
        contaDestinoId: caixaId,
        valor: '150.00',
        data: '2026-07-20',
      });

    expect(resposta.status).toBe(201);
    const transferencia = (
      resposta.body as {
        data: {
          transferencia: {
            descricao: string;
            saida: { conta: { saldoAtual: string }; escopo: { tipo: string } };
            entrada: { conta: { saldoAtual: string }; escopo: { tipo: string; nome: string } };
          };
        };
      }
    ).data.transferencia;

    expect(transferencia.descricao).toBe('Carteira → Casa/Caixa');
    expect(transferencia.saida.conta.saldoAtual).toBe('350.00');
    expect(transferencia.saida.escopo.tipo).toBe('PESSOAL');
    expect(transferencia.entrada.conta.saldoAtual).toBe('150.00');
    expect(transferencia.entrada.escopo).toEqual({ tipo: 'GRUPO', id: grupo.id, nome: 'Casa' });
  });

  it('RF-37: transferencia GRUPO -> PESSOAL funciona igualmente', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);
    const caixaId = await criarSubContaDeGrupo(accessToken, grupo.id);
    await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tipo: 'RECEITA',
        descricao: 'Deposito inicial',
        valor: '300.00',
        dataCompetencia: '2026-07-01',
        situacao: 'PAGA',
        dataEfetivacao: '2026-07-01',
        contaId: caixaId,
        categoriaId: (
          await prisma.categoria.create({
            data: { contaCompartilhadaId: grupo.id, nome: 'Outros', tipo: 'RECEITA' },
          })
        ).id,
      })
      .expect(201);

    const carteira = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Carteira', tipo: 'CARTEIRA' });
    const carteiraId = (carteira.body as { data: { conta: { id: string } } }).data.conta.id;

    const resposta = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: caixaId,
        contaDestinoId: carteiraId,
        valor: '100.00',
        data: '2026-07-05',
      });

    expect(resposta.status).toBe(201);
  });

  it('nao-membro do grupo de destino responde 404', async () => {
    const { accessToken: tokenAdmin } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(tokenAdmin);
    const caixaId = await criarSubContaDeGrupo(tokenAdmin, grupo.id);

    const { accessToken: tokenForasteiro } = await criarUsuarioAutenticado();
    const carteira = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${tokenForasteiro}`)
      .send({ nome: 'Carteira', tipo: 'CARTEIRA', saldoInicial: '500.00' });
    const carteiraId = (carteira.body as { data: { conta: { id: string } } }).data.conta.id;

    const resposta = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${tokenForasteiro}`)
      .send({
        contaOrigemId: carteiraId,
        contaDestinoId: caixaId,
        valor: '50.00',
        data: '2026-07-20',
      });

    expect(resposta.status).toBe(404);
  });

  it('RN-30: OBSERVADOR na ponta de grupo responde 403 PAPEL_INSUFICIENTE', async () => {
    const { accessToken: tokenAdmin } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(tokenAdmin);
    const caixaId = await criarSubContaDeGrupo(tokenAdmin, grupo.id);

    const { accessToken: tokenObservador, usuarioId: observadorId } =
      await criarUsuarioAutenticado();
    await adicionarMembro(grupo.id, observadorId, 'OBSERVADOR');
    const carteira = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${tokenObservador}`)
      .send({ nome: 'Carteira', tipo: 'CARTEIRA', saldoInicial: '500.00' });
    const carteiraId = (carteira.body as { data: { conta: { id: string } } }).data.conta.id;

    const resposta = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${tokenObservador}`)
      .send({
        contaOrigemId: carteiraId,
        contaDestinoId: caixaId,
        valor: '50.00',
        data: '2026-07-20',
      });

    expect(resposta.status).toBe(403);
    expect((resposta.body as { codigo: string }).codigo).toBe('PAPEL_INSUFICIENTE');
  });

  it('RN-32: moedas diferentes respondem 422', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken, { moeda: 'USD' });
    const caixaId = await criarSubContaDeGrupo(accessToken, grupo.id);

    const carteira = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Carteira', tipo: 'CARTEIRA', saldoInicial: '500.00' });
    const carteiraId = (carteira.body as { data: { conta: { id: string } } }).data.conta.id;

    const resposta = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: carteiraId,
        contaDestinoId: caixaId,
        valor: '50.00',
        data: '2026-07-20',
      });

    expect(resposta.status).toBe(422);
    expect((resposta.body as { codigo: string }).codigo).toBe('REGRA_NEGOCIO');
  });
});
