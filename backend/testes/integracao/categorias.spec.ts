import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { garantirCategoriasPadrao, limparBanco } from '../configuracao/banco-teste';

const app = criarServidor();
const SENHA_VALIDA = 'SenhaForte@2026';
let contadorEmail = 0;

async function criarUsuarioAutenticado(): Promise<{ usuarioId: string; accessToken: string }> {
  contadorEmail += 1;
  const email = `categorias-${contadorEmail}@exemplo.com`;

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

describe('/api/v1/categorias', () => {
  beforeAll(async () => {
    await garantirCategoriasPadrao();
  });

  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('lista a arvore de categorias com subcategorias aninhadas', async () => {
    const { accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(200);
    const corpo = resposta.body as {
      data: { categorias: { nome: string; subcategorias: { nome: string }[] }[] };
    };
    expect(corpo.data.categorias).toHaveLength(18);
    const alimentacao = corpo.data.categorias.find((c) => c.nome === 'Alimentação');
    expect(alimentacao?.subcategorias.map((s) => s.nome).sort()).toEqual(
      ['Delivery', 'Lanche', 'Restaurante'].sort(),
    );
  });

  it('apenasRaiz=true omite as subcategorias', async () => {
    const { accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .get('/api/v1/categorias?apenasRaiz=true')
      .set('Authorization', `Bearer ${accessToken}`);

    const corpo = resposta.body as { data: { categorias: { subcategorias: unknown[] }[] } };
    expect(corpo.data.categorias.every((c) => c.subcategorias.length === 0)).toBe(true);
  });

  it('cria uma subcategoria valida sob uma raiz do mesmo tipo', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const listagem = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${accessToken}`);
    const corpo = listagem.body as {
      data: { categorias: { id: string; nome: string; tipo: string }[] };
    };
    const lazer = corpo.data.categorias.find((c) => c.nome === 'Lazer');

    const resposta = await request(app)
      .post('/api/v1/categorias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Cinema', tipo: 'DESPESA', categoriaPaiId: lazer?.id });

    expect(resposta.status).toBe(201);
  });

  it('rejeita subcategoria de subcategoria com 422 REGRA_NEGOCIO', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const listagem = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${accessToken}`);
    const corpo = listagem.body as {
      data: { categorias: { id: string; nome: string; subcategorias: { id: string }[] }[] };
    };
    const alimentacao = corpo.data.categorias.find((c) => c.nome === 'Alimentação');
    const restaurante = alimentacao?.subcategorias[0];

    const resposta = await request(app)
      .post('/api/v1/categorias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Neta', tipo: 'DESPESA', categoriaPaiId: restaurante?.id });

    expect(resposta.status).toBe(422);
    expect((resposta.body as { codigo: string }).codigo).toBe('REGRA_NEGOCIO');
  });

  it('rejeita subcategoria com tipo diferente do pai com 422', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const listagem = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${accessToken}`);
    const corpo = listagem.body as { data: { categorias: { id: string; nome: string }[] } };
    const salario = corpo.data.categorias.find((c) => c.nome === 'Salário');

    const resposta = await request(app)
      .post('/api/v1/categorias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Errada', tipo: 'DESPESA', categoriaPaiId: salario?.id });

    expect(resposta.status).toBe(422);
  });

  it('filtra a arvore por tipo', async () => {
    const { accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .get('/api/v1/categorias?tipo=RECEITA')
      .set('Authorization', `Bearer ${accessToken}`);

    const corpo = resposta.body as { data: { categorias: { tipo: string }[] } };
    expect(corpo.data.categorias.every((c) => c.tipo === 'RECEITA')).toBe(true);
    expect(corpo.data.categorias.length).toBeGreaterThan(0);
  });

  it('busca uma categoria por id', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const listagem = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${accessToken}`);
    const corpo = listagem.body as { data: { categorias: { id: string; nome: string }[] } };
    const pets = corpo.data.categorias.find((c) => c.nome === 'Pets');

    const resposta = await request(app)
      .get(`/api/v1/categorias/${pets?.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(200);
    expect((resposta.body as { data: { categoria: { nome: string } } }).data.categoria.nome).toBe(
      'Pets',
    );
  });

  it('atualiza o nome e a cor de uma categoria', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const listagem = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${accessToken}`);
    const corpo = listagem.body as { data: { categorias: { id: string; nome: string }[] } };
    const pets = corpo.data.categorias.find((c) => c.nome === 'Pets');

    const resposta = await request(app)
      .patch(`/api/v1/categorias/${pets?.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Animais', cor: '#000000' });

    expect(resposta.status).toBe(200);
    const atualizada = (resposta.body as { data: { categoria: { nome: string; cor: string } } })
      .data.categoria;
    expect(atualizada.nome).toBe('Animais');
    expect(atualizada.cor).toBe('#000000');
  });

  it('impede excluir categoria com subcategorias', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const listagem = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${accessToken}`);
    const corpo = listagem.body as { data: { categorias: { id: string; nome: string }[] } };
    const alimentacao = corpo.data.categorias.find((c) => c.nome === 'Alimentação');

    const resposta = await request(app)
      .delete(`/api/v1/categorias/${alimentacao?.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(422);
  });

  it('exclui uma categoria sem subcategorias e sem movimentacoes', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const listagem = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${accessToken}`);
    const corpo = listagem.body as { data: { categorias: { id: string; nome: string }[] } };
    const pets = corpo.data.categorias.find((c) => c.nome === 'Pets');

    const resposta = await request(app)
      .delete(`/api/v1/categorias/${pets?.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(204);
  });

  it('responde 404 (nao 403) ao acessar categoria de outro usuario', async () => {
    const dono = await criarUsuarioAutenticado();
    const outro = await criarUsuarioAutenticado();
    const listagem = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${dono.accessToken}`);
    const corpo = listagem.body as { data: { categorias: { id: string }[] } };
    const idCategoria = corpo.data.categorias[0]?.id;

    const resposta = await request(app)
      .get(`/api/v1/categorias/${idCategoria}`)
      .set('Authorization', `Bearer ${outro.accessToken}`);

    expect(resposta.status).toBe(404);
  });

  it('responde 404 ao atualizar categoria de outro usuario', async () => {
    const dono = await criarUsuarioAutenticado();
    const outro = await criarUsuarioAutenticado();
    const listagem = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${dono.accessToken}`);
    const corpo = listagem.body as { data: { categorias: { id: string }[] } };
    const idCategoria = corpo.data.categorias[0]?.id;

    const resposta = await request(app)
      .patch(`/api/v1/categorias/${idCategoria}`)
      .set('Authorization', `Bearer ${outro.accessToken}`)
      .send({ nome: 'Roubada' });

    expect(resposta.status).toBe(404);
  });

  it('responde 404 ao excluir categoria de outro usuario', async () => {
    const dono = await criarUsuarioAutenticado();
    const outro = await criarUsuarioAutenticado();
    const listagem = await request(app)
      .get('/api/v1/categorias')
      .set('Authorization', `Bearer ${dono.accessToken}`);
    const corpo = listagem.body as { data: { categorias: { id: string }[] } };
    const idCategoria = corpo.data.categorias[0]?.id;

    const resposta = await request(app)
      .delete(`/api/v1/categorias/${idCategoria}`)
      .set('Authorization', `Bearer ${outro.accessToken}`);

    expect(resposta.status).toBe(404);
  });
});
