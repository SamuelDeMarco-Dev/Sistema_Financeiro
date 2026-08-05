import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarUsuario } from '../fabricas';

const app = criarServidor();

// Etiquetas nao dependem de nenhum efeito colateral do cadastro (a copia
// de categorias padrao, por exemplo) — fabricar o usuario direto no
// banco e mais rapido que o fluxo HTTP completo (issue #31).
async function criarUsuarioAutenticado(): Promise<{ usuarioId: string; accessToken: string }> {
  const { usuario, accessToken } = await fabricarUsuario();
  return { usuarioId: usuario.id, accessToken };
}

describe('/api/v1/etiquetas', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('cria uma etiqueta normalizada para minusculas', async () => {
    const { accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .post('/api/v1/etiquetas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Viagem-Chile', cor: '#0EA5E9' });

    expect(resposta.status).toBe(201);
    const corpo = resposta.body as { data: { etiqueta: { nome: string } } };
    expect(corpo.data.etiqueta.nome).toBe('viagem-chile');
  });

  it('"Viagem" e "viagem" colidem com 409 CONFLITO', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    await request(app)
      .post('/api/v1/etiquetas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Viagem' });

    const resposta = await request(app)
      .post('/api/v1/etiquetas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'viagem' });

    expect(resposta.status).toBe(409);
    expect((resposta.body as { codigo: string }).codigo).toBe('CONFLITO');
  });

  it('lista etiquetas com quantidadeMovimentacoes', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    await request(app)
      .post('/api/v1/etiquetas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'viagem' });

    const resposta = await request(app)
      .get('/api/v1/etiquetas')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(200);
    const corpo = resposta.body as {
      data: { etiquetas: { nome: string; quantidadeMovimentacoes: number }[] };
    };
    expect(corpo.data.etiquetas).toEqual([
      expect.objectContaining({ nome: 'viagem', quantidadeMovimentacoes: 0 }) as unknown,
    ]);
  });

  it('exclui uma etiqueta com 204', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const criada = await request(app)
      .post('/api/v1/etiquetas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'descartavel' });
    const idEtiqueta = (criada.body as { data: { etiqueta: { id: string } } }).data.etiqueta.id;

    const resposta = await request(app)
      .delete(`/api/v1/etiquetas/${idEtiqueta}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(resposta.status).toBe(204);

    const listagem = await request(app)
      .get('/api/v1/etiquetas')
      .set('Authorization', `Bearer ${accessToken}`);
    expect((listagem.body as { data: { etiquetas: unknown[] } }).data.etiquetas).toHaveLength(0);
  });

  it('responde 404 (nao 403) ao atualizar etiqueta de outro usuario', async () => {
    const dono = await criarUsuarioAutenticado();
    const outro = await criarUsuarioAutenticado();
    const criada = await request(app)
      .post('/api/v1/etiquetas')
      .set('Authorization', `Bearer ${dono.accessToken}`)
      .send({ nome: 'privada' });
    const idEtiqueta = (criada.body as { data: { etiqueta: { id: string } } }).data.etiqueta.id;

    const resposta = await request(app)
      .patch(`/api/v1/etiquetas/${idEtiqueta}`)
      .set('Authorization', `Bearer ${outro.accessToken}`)
      .send({ nome: 'roubada' });

    expect(resposta.status).toBe(404);
  });

  it('responde 404 (nao 403) ao excluir etiqueta de outro usuario', async () => {
    const dono = await criarUsuarioAutenticado();
    const outro = await criarUsuarioAutenticado();
    const criada = await request(app)
      .post('/api/v1/etiquetas')
      .set('Authorization', `Bearer ${dono.accessToken}`)
      .send({ nome: 'privada' });
    const idEtiqueta = (criada.body as { data: { etiqueta: { id: string } } }).data.etiqueta.id;

    const resposta = await request(app)
      .delete(`/api/v1/etiquetas/${idEtiqueta}`)
      .set('Authorization', `Bearer ${outro.accessToken}`);

    expect(resposta.status).toBe(404);
  });
});
