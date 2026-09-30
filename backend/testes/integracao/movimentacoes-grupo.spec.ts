import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarUsuario } from '../fabricas';
import type { Categoria } from '@prisma/client';

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

async function criarCategoriaDeGrupo(
  contaCompartilhadaId: string,
  tipo: 'RECEITA' | 'DESPESA' = 'DESPESA',
): Promise<Categoria> {
  return prisma.categoria.create({
    data: { contaCompartilhadaId, nome: 'Mercado', tipo },
  });
}

describe('movimentacoes de grupo (issue #72)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('RN-09: PARTICIPANTE cria movimentacao ligada DIRETO ao grupo (sem conta)', async () => {
    const { usuarioId, accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);
    const categoria = await criarCategoriaDeGrupo(grupo.id);
    const { accessToken: tokenParticipante, usuarioId: participanteId } =
      await criarUsuarioAutenticado();
    await adicionarMembro(grupo.id, participanteId, 'PARTICIPANTE');
    void usuarioId;

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${tokenParticipante}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Conta de luz',
        valor: '218.40',
        dataCompetencia: '2026-07-10',
        situacao: 'PAGA',
        dataEfetivacao: '2026-07-10',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoria.id,
      });

    expect(resposta.status).toBe(201);
    const movimentacao = (resposta.body as { data: { movimentacao: Record<string, unknown> } }).data
      .movimentacao;
    expect(movimentacao.conta).toBeNull();
    expect(movimentacao.contaCompartilhada).toEqual({ id: grupo.id, nome: 'Casa' });
    expect(movimentacao.autor).toEqual({
      id: participanteId,
      nome: 'Usuaria de Teste',
      fotoUrl: null,
    });
  });

  it('RN-30: OBSERVADOR nao pode criar movimentacao no grupo (403 PAPEL_INSUFICIENTE)', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);
    const categoria = await criarCategoriaDeGrupo(grupo.id);
    const { accessToken: tokenObservador, usuarioId: observadorId } =
      await criarUsuarioAutenticado();
    await adicionarMembro(grupo.id, observadorId, 'OBSERVADOR');

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${tokenObservador}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Conta de luz',
        valor: '218.40',
        dataCompetencia: '2026-07-10',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoria.id,
      });

    expect(resposta.status).toBe(403);
    expect((resposta.body as { codigo: string }).codigo).toBe('PAPEL_INSUFICIENTE');
  });

  it('nao-membro do grupo recebe 404 ao tentar criar (RN-51, nunca 403)', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);
    const categoria = await criarCategoriaDeGrupo(grupo.id);
    const { accessToken: tokenForasteiro } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${tokenForasteiro}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Conta de luz',
        valor: '218.40',
        dataCompetencia: '2026-07-10',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoria.id,
      });

    expect(resposta.status).toBe(404);
  });

  it('RN-11: categoria de OUTRO grupo responde 404', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);
    const outroGrupo = await criarGrupo(accessToken, { nome: 'Viagem' });
    const categoriaDeOutroGrupo = await criarCategoriaDeGrupo(outroGrupo.id);

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Conta de luz',
        valor: '218.40',
        dataCompetencia: '2026-07-10',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoriaDeOutroGrupo.id,
      });

    expect(resposta.status).toBe(404);
  });

  it('RN-11: categoria PESSOAL em movimentacao de grupo responde 404', async () => {
    const { accessToken, usuarioId } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);
    const categoriaPessoal = await prisma.categoria.create({
      data: { usuarioId, nome: 'Pessoal', tipo: 'DESPESA' },
    });

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Conta de luz',
        valor: '218.40',
        dataCompetencia: '2026-07-10',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoriaPessoal.id,
      });

    expect(resposta.status).toBe(404);
  });

  it('RF-34: movimentacoes pessoais e de grupo nunca se misturam nas listagens', async () => {
    const { accessToken, usuarioId } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);
    const categoriaGrupo = await criarCategoriaDeGrupo(grupo.id);
    const contaPessoal = await prisma.conta.create({
      data: { usuarioId, nome: 'Carteira', tipo: 'CARTEIRA' },
    });
    const categoriaPessoal = await prisma.categoria.create({
      data: { usuarioId, nome: 'Pessoal', tipo: 'DESPESA' },
    });

    await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Despesa pessoal',
        valor: '10.00',
        dataCompetencia: '2026-07-10',
        contaId: contaPessoal.id,
        categoriaId: categoriaPessoal.id,
      })
      .expect(201);

    await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Despesa do grupo',
        valor: '20.00',
        dataCompetencia: '2026-07-10',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoriaGrupo.id,
      })
      .expect(201);

    const listaPessoal = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`);
    const listaGrupo = await request(app)
      .get(`/api/v1/movimentacoes?contaCompartilhadaId=${grupo.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    const descricoesPessoal = (
      listaPessoal.body as { data: { movimentacoes: { descricao: string }[] } }
    ).data.movimentacoes.map((item) => item.descricao);
    const descricoesGrupo = (
      listaGrupo.body as { data: { movimentacoes: { descricao: string }[] } }
    ).data.movimentacoes.map((item) => item.descricao);

    expect(descricoesPessoal).toEqual(['Despesa pessoal']);
    expect(descricoesGrupo).toEqual(['Despesa do grupo']);
  });

  it('RN-05/RN-09: saldo do grupo soma sub-conta e ligacao direta', async () => {
    const { accessToken, usuarioId } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);
    const categoria = await criarCategoriaDeGrupo(grupo.id, 'RECEITA');
    void usuarioId;

    const subConta = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Banco do grupo', tipo: 'CONTA_CORRENTE', contaCompartilhadaId: grupo.id });
    expect(subConta.status).toBe(201);
    const subContaId = (subConta.body as { data: { conta: { id: string } } }).data.conta.id;

    await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tipo: 'RECEITA',
        descricao: 'Deposito na sub-conta',
        valor: '300.00',
        dataCompetencia: '2026-07-10',
        situacao: 'PAGA',
        dataEfetivacao: '2026-07-10',
        contaId: subContaId,
        categoriaId: categoria.id,
      })
      .expect(201);

    await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tipo: 'RECEITA',
        descricao: 'Receita direta do grupo',
        valor: '150.00',
        dataCompetencia: '2026-07-11',
        situacao: 'PAGA',
        dataEfetivacao: '2026-07-11',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoria.id,
      })
      .expect(201);

    const detalhe = await request(app)
      .get(`/api/v1/contas-compartilhadas/${grupo.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(
      (detalhe.body as { data: { contaCompartilhada: { saldoTotal: string } } }).data
        .contaCompartilhada.saldoTotal,
    ).toBe('450.00');
  });

  it('RN-31: PARTICIPANTE edita a propria movimentacao, mas nao a de outro membro', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);
    const categoria = await criarCategoriaDeGrupo(grupo.id);
    const { accessToken: tokenA, usuarioId: usuarioA } = await criarUsuarioAutenticado();
    const { accessToken: tokenB, usuarioId: usuarioB } = await criarUsuarioAutenticado();
    await adicionarMembro(grupo.id, usuarioA, 'PARTICIPANTE');
    await adicionarMembro(grupo.id, usuarioB, 'PARTICIPANTE');

    const criada = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Despesa do participante A',
        valor: '50.00',
        dataCompetencia: '2026-07-10',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoria.id,
      });
    const movimentacaoId = (criada.body as { data: { movimentacao: { id: string } } }).data
      .movimentacao.id;

    const edicaoPropria = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacaoId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ descricao: 'Despesa atualizada' });
    expect(edicaoPropria.status).toBe(200);

    const edicaoDeTerceiro = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacaoId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ descricao: 'Tentativa de B' });
    expect(edicaoDeTerceiro.status).toBe(403);
    expect((edicaoDeTerceiro.body as { codigo: string }).codigo).toBe('PAPEL_INSUFICIENTE');
  });

  it('RN-30: ADMINISTRADOR edita e exclui movimentacao de qualquer membro', async () => {
    const { accessToken: tokenAdmin } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(tokenAdmin);
    const categoria = await criarCategoriaDeGrupo(grupo.id);
    const { accessToken: tokenParticipante, usuarioId: participanteId } =
      await criarUsuarioAutenticado();
    await adicionarMembro(grupo.id, participanteId, 'PARTICIPANTE');

    const criada = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${tokenParticipante}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Despesa do participante',
        valor: '50.00',
        dataCompetencia: '2026-07-10',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoria.id,
      });
    const movimentacaoId = (criada.body as { data: { movimentacao: { id: string } } }).data
      .movimentacao.id;

    const edicao = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacaoId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ descricao: 'Editado pelo administrador' });
    expect(edicao.status).toBe(200);

    const exclusao = await request(app)
      .delete(`/api/v1/movimentacoes/${movimentacaoId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(exclusao.status).toBe(204);
  });

  it('RF-29: ADMINISTRADOR paga e estorna movimentacao ligada direto ao grupo', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);
    const categoria = await criarCategoriaDeGrupo(grupo.id);

    const criada = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Conta de internet',
        valor: '100.00',
        dataCompetencia: '2026-07-10',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoria.id,
      });
    const movimentacaoId = (criada.body as { data: { movimentacao: { id: string } } }).data
      .movimentacao.id;

    const pagar = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacaoId}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dataEfetivacao: '2026-07-12' });
    expect(pagar.status).toBe(200);
    expect(
      (pagar.body as { data: { movimentacao: { situacao: string } } }).data.movimentacao.situacao,
    ).toBe('PAGA');

    const estornar = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacaoId}/estornar`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(estornar.status).toBe(200);
    expect(
      (estornar.body as { data: { movimentacao: { situacao: string } } }).data.movimentacao
        .situacao,
    ).toBe('PENDENTE');
  });

  it('RF-26: duplicar movimentacao de grupo cria uma copia no mesmo grupo, com o duplicador como autor', async () => {
    const { accessToken: tokenAdmin } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(tokenAdmin);
    const categoria = await criarCategoriaDeGrupo(grupo.id);
    const { accessToken: tokenParticipante, usuarioId: participanteId } =
      await criarUsuarioAutenticado();
    await adicionarMembro(grupo.id, participanteId, 'PARTICIPANTE');

    const criada = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Assinatura mensal',
        valor: '40.00',
        dataCompetencia: '2026-07-10',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoria.id,
      });
    const movimentacaoId = (criada.body as { data: { movimentacao: { id: string } } }).data
      .movimentacao.id;

    const duplicada = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacaoId}/duplicar`)
      .set('Authorization', `Bearer ${tokenParticipante}`)
      .send({ dataCompetencia: '2026-08-10' });

    expect(duplicada.status).toBe(201);
    const copia = (duplicada.body as { data: { movimentacao: Record<string, unknown> } }).data
      .movimentacao;
    expect(copia.contaCompartilhada).toEqual({ id: grupo.id, nome: 'Casa' });
    expect((copia.autor as { id: string }).id).toBe(participanteId);
  });

  it('OBSERVADOR pode ver a listagem do grupo, mas nao pode duplicar (403)', async () => {
    const { accessToken: tokenAdmin } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(tokenAdmin);
    const categoria = await criarCategoriaDeGrupo(grupo.id);
    const { accessToken: tokenObservador, usuarioId: observadorId } =
      await criarUsuarioAutenticado();
    await adicionarMembro(grupo.id, observadorId, 'OBSERVADOR');

    const criada = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Despesa do grupo',
        valor: '40.00',
        dataCompetencia: '2026-07-10',
        contaCompartilhadaId: grupo.id,
        categoriaId: categoria.id,
      });
    const movimentacaoId = (criada.body as { data: { movimentacao: { id: string } } }).data
      .movimentacao.id;

    const listagem = await request(app)
      .get(`/api/v1/movimentacoes?contaCompartilhadaId=${grupo.id}`)
      .set('Authorization', `Bearer ${tokenObservador}`);
    expect(listagem.status).toBe(200);
    expect(
      (listagem.body as { data: { movimentacoes: unknown[] } }).data.movimentacoes,
    ).toHaveLength(1);

    const duplicar = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacaoId}/duplicar`)
      .set('Authorization', `Bearer ${tokenObservador}`)
      .send({});
    expect(duplicar.status).toBe(403);
  });
});
