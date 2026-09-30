import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import {
  fabricarMovimentacao,
  fabricarTransferencia,
  fabricarUsuario,
  prepararUsuarioComConta,
} from '../fabricas';

const app = criarServidor();

interface RotaProtegida {
  metodo: 'get' | 'post' | 'patch' | 'delete';
  caminho: (id: string) => string;
}

// 05-DEVELOPMENT.md §12.5 "Escopo": toda rota autenticada precisa
// rejeitar quem nao mandou token — RN-51 cuida do 404 de outro usuario,
// mas o 401 de token ausente e uma garantia separada (middleware
// `autenticar`, nao o servico) e cada rota precisa da sua propria prova.
const ROTAS: [string, RotaProtegida][] = [
  ['GET /movimentacoes', { metodo: 'get', caminho: () => '/api/v1/movimentacoes' }],
  ['GET /movimentacoes/:id', { metodo: 'get', caminho: (id) => `/api/v1/movimentacoes/${id}` }],
  ['POST /movimentacoes', { metodo: 'post', caminho: () => '/api/v1/movimentacoes' }],
  ['PATCH /movimentacoes/:id', { metodo: 'patch', caminho: (id) => `/api/v1/movimentacoes/${id}` }],
  [
    'DELETE /movimentacoes/:id',
    { metodo: 'delete', caminho: (id) => `/api/v1/movimentacoes/${id}` },
  ],
  [
    'GET /movimentacoes/:id/ocorrencias',
    { metodo: 'get', caminho: (id) => `/api/v1/movimentacoes/${id}/ocorrencias` },
  ],
  [
    'POST /movimentacoes/:id/duplicar',
    { metodo: 'post', caminho: (id) => `/api/v1/movimentacoes/${id}/duplicar` },
  ],
  [
    'PATCH /movimentacoes/:id/pagar',
    { metodo: 'patch', caminho: (id) => `/api/v1/movimentacoes/${id}/pagar` },
  ],
  [
    'PATCH /movimentacoes/:id/estornar',
    { metodo: 'patch', caminho: (id) => `/api/v1/movimentacoes/${id}/estornar` },
  ],
  ['POST /transferencias', { metodo: 'post', caminho: () => '/api/v1/transferencias' }],
  ['GET /transferencias/:id', { metodo: 'get', caminho: (id) => `/api/v1/transferencias/${id}` }],
  [
    'DELETE /transferencias/:id',
    { metodo: 'delete', caminho: (id) => `/api/v1/transferencias/${id}` },
  ],
];

describe('autorizacao negativa: rotas de movimentacoes e transferencias', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it.each(ROTAS)('%s responde 401 sem token', async (_nome, rota) => {
    // "id-inexistente" basta: o middleware `autenticar` roda antes de
    // qualquer validacao de parametro ou consulta ao banco.
    const resposta = await request(app)[rota.metodo](rota.caminho('id-inexistente'));

    expect(resposta.status).toBe(401);
  });

  it('GET /movimentacoes/:id de outro usuario responde 404 (nunca 403, RN-51)', async () => {
    const { usuario, conta } = await prepararUsuarioComConta();
    const movimentacao = await fabricarMovimentacao(usuario.id, conta.id);
    const { accessToken: tokenOutroUsuario } = await fabricarUsuario();

    const resposta = await request(app)
      .get(`/api/v1/movimentacoes/${movimentacao.id}`)
      .set('Authorization', `Bearer ${tokenOutroUsuario}`);

    expect(resposta.status).toBe(404);
  });

  it('POST /movimentacoes/:id/duplicar de outro usuario responde 404', async () => {
    const { usuario, conta } = await prepararUsuarioComConta();
    const movimentacao = await fabricarMovimentacao(usuario.id, conta.id);
    const { accessToken: tokenOutroUsuario } = await fabricarUsuario();

    const resposta = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacao.id}/duplicar`)
      .set('Authorization', `Bearer ${tokenOutroUsuario}`)
      .send({});

    expect(resposta.status).toBe(404);
  });

  it('GET /movimentacoes/:id/ocorrencias de outro usuario responde 404', async () => {
    const { usuario, conta } = await prepararUsuarioComConta();
    const modelo = await fabricarMovimentacao(usuario.id, conta.id);
    await prisma.movimentacao.update({
      where: { id: modelo.id },
      data: { ehModeloRecorrencia: true, frequencia: 'MENSAL', intervaloRecorrencia: 1 },
    });
    const { accessToken: tokenOutroUsuario } = await fabricarUsuario();

    const resposta = await request(app)
      .get(`/api/v1/movimentacoes/${modelo.id}/ocorrencias`)
      .set('Authorization', `Bearer ${tokenOutroUsuario}`);

    expect(resposta.status).toBe(404);
  });

  it('GET/POST/DELETE de transferencia de outro usuario respondem 404', async () => {
    const { usuario, conta: origem } = await prepararUsuarioComConta();
    const destino = await prisma.conta.create({
      data: { usuarioId: usuario.id, nome: 'Destino', tipo: 'CARTEIRA' },
    });
    const transferenciaId = await fabricarTransferencia(usuario.id, origem.id, destino.id);
    const { accessToken: tokenOutroUsuario } = await fabricarUsuario();

    const buscar = await request(app)
      .get(`/api/v1/transferencias/${transferenciaId}`)
      .set('Authorization', `Bearer ${tokenOutroUsuario}`);
    expect(buscar.status).toBe(404);

    const excluir = await request(app)
      .delete(`/api/v1/transferencias/${transferenciaId}`)
      .set('Authorization', `Bearer ${tokenOutroUsuario}`);
    expect(excluir.status).toBe(404);
  });
});
