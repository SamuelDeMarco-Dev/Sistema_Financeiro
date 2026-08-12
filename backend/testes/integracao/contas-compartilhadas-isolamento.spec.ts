import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarGrupoComMembros } from '../fabricas';

const app = criarServidor();

/** issue #77: prova que um membro (mesmo ADMINISTRADOR) do grupo A nao
 * alcanca NADA do grupo B — nenhuma rota de escopo de grupo, em nenhum
 * recurso (conta/categoria/etiqueta/movimentacao/membros/convites),
 * responde de forma diferente de 404 (RN-51: nunca 403, o que
 * confirmaria a existencia do grupo alheio). */
describe('isolamento entre grupos (issue #77)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('ADMINISTRADOR do grupo A recebe 404 em toda rota de escopo do grupo B', async () => {
    const { administrador: adminA } = await fabricarGrupoComMembros([]);
    const { grupo: grupoB, administrador: adminB } = await fabricarGrupoComMembros([]);
    const contaPessoalA = await prisma.conta.create({
      data: { usuarioId: adminA.usuario.id, nome: 'Carteira A', tipo: 'CARTEIRA' },
    });

    const caixaB = await prisma.conta.create({
      data: { contaCompartilhadaId: grupoB.id, nome: 'Caixa B', tipo: 'CONTA_CORRENTE' },
    });
    const categoriaB = await prisma.categoria.create({
      data: { contaCompartilhadaId: grupoB.id, nome: 'Categoria B', tipo: 'DESPESA' },
    });
    const movB = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${adminB.accessToken}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Despesa do grupo B',
        valor: '10.00',
        dataCompetencia: '2026-07-10',
        contaId: caixaB.id,
        categoriaId: categoriaB.id,
      });
    const movBId = (movB.body as { data: { movimentacao: { id: string } } }).data.movimentacao.id;
    const membroBId = adminB.membro.id;

    const tentativas: { nome: string; requisicao: () => request.Test }[] = [
      {
        nome: 'GET /contas-compartilhadas/:idB',
        requisicao: () =>
          request(app)
            .get(`/api/v1/contas-compartilhadas/${grupoB.id}`)
            .set('Authorization', `Bearer ${adminA.accessToken}`),
      },
      {
        nome: 'PATCH /contas-compartilhadas/:idB',
        requisicao: () =>
          request(app)
            .patch(`/api/v1/contas-compartilhadas/${grupoB.id}`)
            .set('Authorization', `Bearer ${adminA.accessToken}`)
            .send({ nome: 'Invadido' }),
      },
      {
        nome: 'DELETE /contas-compartilhadas/:idB',
        requisicao: () =>
          request(app)
            .delete(`/api/v1/contas-compartilhadas/${grupoB.id}`)
            .set('Authorization', `Bearer ${adminA.accessToken}`)
            .send({ confirmacao: grupoB.nome }),
      },
      {
        nome: 'GET /contas-compartilhadas/:idB/membros',
        requisicao: () =>
          request(app)
            .get(`/api/v1/contas-compartilhadas/${grupoB.id}/membros`)
            .set('Authorization', `Bearer ${adminA.accessToken}`),
      },
      {
        nome: 'DELETE /contas-compartilhadas/:idB/membros/:membroB',
        requisicao: () =>
          request(app)
            .delete(`/api/v1/contas-compartilhadas/${grupoB.id}/membros/${membroBId}`)
            .set('Authorization', `Bearer ${adminA.accessToken}`),
      },
      {
        nome: 'PATCH /contas-compartilhadas/:idB/membros/:membroB',
        requisicao: () =>
          request(app)
            .patch(`/api/v1/contas-compartilhadas/${grupoB.id}/membros/${membroBId}`)
            .set('Authorization', `Bearer ${adminA.accessToken}`)
            .send({ papel: 'OBSERVADOR' }),
      },
      {
        nome: 'POST /contas-compartilhadas/:idB/transferir-administracao',
        requisicao: () =>
          request(app)
            .post(`/api/v1/contas-compartilhadas/${grupoB.id}/transferir-administracao`)
            .set('Authorization', `Bearer ${adminA.accessToken}`)
            .send({ novoAdministradorMembroId: membroBId }),
      },
      {
        nome: 'POST /contas-compartilhadas/:idB/convites',
        requisicao: () =>
          request(app)
            .post(`/api/v1/contas-compartilhadas/${grupoB.id}/convites`)
            .set('Authorization', `Bearer ${adminA.accessToken}`)
            .send({ email: 'invasor@exemplo.com', papel: 'PARTICIPANTE' }),
      },
      {
        nome: 'GET /contas-compartilhadas/:idB/convites',
        requisicao: () =>
          request(app)
            .get(`/api/v1/contas-compartilhadas/${grupoB.id}/convites`)
            .set('Authorization', `Bearer ${adminA.accessToken}`),
      },
      {
        nome: 'POST /contas (contaCompartilhadaId=idB)',
        requisicao: () =>
          request(app)
            .post('/api/v1/contas')
            .set('Authorization', `Bearer ${adminA.accessToken}`)
            .send({ nome: 'Invasao', tipo: 'CARTEIRA', contaCompartilhadaId: grupoB.id }),
      },
      {
        nome: 'POST /categorias (contaCompartilhadaId=idB)',
        requisicao: () =>
          request(app)
            .post('/api/v1/categorias')
            .set('Authorization', `Bearer ${adminA.accessToken}`)
            .send({ nome: 'Invasao', tipo: 'DESPESA', contaCompartilhadaId: grupoB.id }),
      },
      {
        nome: 'POST /etiquetas (contaCompartilhadaId=idB)',
        requisicao: () =>
          request(app)
            .post('/api/v1/etiquetas')
            .set('Authorization', `Bearer ${adminA.accessToken}`)
            .send({ nome: 'invasao', contaCompartilhadaId: grupoB.id }),
      },
      {
        nome: 'GET /movimentacoes?contaCompartilhadaId=idB',
        requisicao: () =>
          request(app)
            .get(`/api/v1/movimentacoes?contaCompartilhadaId=${grupoB.id}`)
            .set('Authorization', `Bearer ${adminA.accessToken}`),
      },
      {
        nome: 'GET /movimentacoes/:idDaMovB',
        requisicao: () =>
          request(app)
            .get(`/api/v1/movimentacoes/${movBId}`)
            .set('Authorization', `Bearer ${adminA.accessToken}`),
      },
      {
        nome: 'PATCH /movimentacoes/:idDaMovB',
        requisicao: () =>
          request(app)
            .patch(`/api/v1/movimentacoes/${movBId}`)
            .set('Authorization', `Bearer ${adminA.accessToken}`)
            .send({ descricao: 'Invadido' }),
      },
      {
        nome: 'DELETE /movimentacoes/:idDaMovB',
        requisicao: () =>
          request(app)
            .delete(`/api/v1/movimentacoes/${movBId}`)
            .set('Authorization', `Bearer ${adminA.accessToken}`),
      },
      {
        nome: 'POST /movimentacoes/:idDaMovB/duplicar',
        requisicao: () =>
          request(app)
            .post(`/api/v1/movimentacoes/${movBId}/duplicar`)
            .set('Authorization', `Bearer ${adminA.accessToken}`)
            .send({}),
      },
      {
        nome: 'POST /transferencias (destino no grupo B)',
        requisicao: () =>
          request(app)
            .post('/api/v1/transferencias')
            .set('Authorization', `Bearer ${adminA.accessToken}`)
            .send({
              contaOrigemId: contaPessoalA.id,
              contaDestinoId: caixaB.id,
              valor: '10.00',
              data: '2026-07-10',
            }),
      },
    ];

    for (const tentativa of tentativas) {
      const resposta = await tentativa.requisicao();
      expect(resposta.status, `${tentativa.nome} deveria responder 404`).toBe(404);
    }
  });
});

describe('invariante de administrador unico sob concorrencia (issue #77, RN-28)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('duas transferencias de administracao concorrentes nunca deixam o grupo com 0 ou 2 administradores', async () => {
    const { grupo, administrador, membros } = await fabricarGrupoComMembros([
      'PARTICIPANTE',
      'PARTICIPANTE',
    ]);
    const [candidatoX, candidatoY] = membros;
    if (!candidatoX || !candidatoY) {
      throw new Error('fabricarGrupoComMembros nao retornou os 2 candidatos esperados.');
    }

    const disparar = (novoAdministradorMembroId: string) =>
      request(app)
        .post(`/api/v1/contas-compartilhadas/${grupo.id}/transferir-administracao`)
        .set('Authorization', `Bearer ${administrador.accessToken}`)
        .send({ novoAdministradorMembroId });

    const [respostaX, respostaY] = await Promise.all([
      disparar(candidatoX.membro.id),
      disparar(candidatoY.membro.id),
    ]);

    const sucessos = [respostaX, respostaY].filter((resposta) => resposta.status === 200);
    expect(sucessos.length).toBe(1);
    for (const resposta of [respostaX, respostaY]) {
      if (resposta.status !== 200) {
        expect([403, 409]).toContain(resposta.status);
      }
    }

    const administradoresAtivos = await prisma.membroCompartilhado.findMany({
      where: { contaCompartilhadaId: grupo.id, papel: 'ADMINISTRADOR', situacao: 'ATIVO' },
    });
    expect(administradoresAtivos).toHaveLength(1);
    expect([candidatoX.usuario.id, candidatoY.usuario.id]).toContain(
      administradoresAtivos[0]?.usuarioId,
    );
  });
});
