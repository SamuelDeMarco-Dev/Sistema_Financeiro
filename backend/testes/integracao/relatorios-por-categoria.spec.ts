import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarMovimentacao, prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface RespostaPorCategoria {
  data: {
    periodo: { dataInicio: string; dataFim: string };
    tipo: string;
    itens: { categoria: { nome: string; cor: string }; total: string; percentual: number }[];
    total: string;
  };
}

async function buscar(accessToken: string, query: string): Promise<RespostaPorCategoria['data']> {
  const resposta = await request(app)
    .get(`/api/v1/relatorios/por-categoria${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(resposta.status).toBe(200);
  return (resposta.body as RespostaPorCategoria).data;
}

describe('GET /relatorios/por-categoria (issue #52)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('exige autenticacao', async () => {
    const resposta = await request(app).get(
      '/api/v1/relatorios/por-categoria?dataInicio=2026-01-01&dataFim=2026-12-31',
    );
    expect(resposta.status).toBe(401);
  });

  it('rejeita dataInicio > dataFim com 400', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get('/api/v1/relatorios/por-categoria?dataInicio=2026-12-31&dataFim=2026-01-01')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(400);
  });

  it('rejeita intervalo de mais de 5 anos com 400', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get('/api/v1/relatorios/por-categoria?dataInicio=2016-01-01&dataFim=2026-12-31')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(400);
  });

  it('aceita exatamente 5 anos', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get('/api/v1/relatorios/por-categoria?dataInicio=2021-01-01&dataFim=2026-01-01')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(200);
  });

  it('usa DESPESA por padrao, agrupa na raiz e os percentuais somam 100', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const raiz = await prisma.categoria.create({
      data: { usuarioId: usuario.id, nome: 'Alimentação', tipo: 'DESPESA' },
    });
    const sub = await prisma.categoria.create({
      data: {
        usuarioId: usuario.id,
        nome: 'Restaurante',
        tipo: 'DESPESA',
        categoriaPaiId: raiz.id,
      },
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '150.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-05-05',
      dataEfetivacao: '2026-05-05',
      categoriaId: raiz.id,
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '50.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-06-05',
      dataEfetivacao: '2026-06-05',
      categoriaId: sub.id,
    });

    const dados = await buscar(accessToken, '?dataInicio=2026-01-01&dataFim=2026-12-31');

    expect(dados.tipo).toBe('DESPESA');
    expect(dados.itens).toHaveLength(1);
    expect(dados.itens[0]).toMatchObject({ categoria: { nome: 'Alimentação' } });
    expect(dados.total).toBe('200.00');
    const soma = dados.itens.reduce((acc, item) => acc + item.percentual, 0);
    expect(soma).toBe(100);
  });

  it('incluirSubcategorias=true detalha em vez de agrupar', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const raiz = await prisma.categoria.create({
      data: { usuarioId: usuario.id, nome: 'Alimentação', tipo: 'DESPESA' },
    });
    const sub = await prisma.categoria.create({
      data: {
        usuarioId: usuario.id,
        nome: 'Restaurante',
        tipo: 'DESPESA',
        categoriaPaiId: raiz.id,
      },
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '150.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-05-05',
      dataEfetivacao: '2026-05-05',
      categoriaId: raiz.id,
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '50.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-06-05',
      dataEfetivacao: '2026-06-05',
      categoriaId: sub.id,
    });

    const dados = await buscar(
      accessToken,
      '?dataInicio=2026-01-01&dataFim=2026-12-31&incluirSubcategorias=true',
    );

    expect(dados.itens).toHaveLength(2);
  });

  it('respeita tipo=RECEITA', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const salario = await prisma.categoria.create({
      data: { usuarioId: usuario.id, nome: 'Salário', tipo: 'RECEITA' },
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '5000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-05-05',
      dataEfetivacao: '2026-05-05',
      categoriaId: salario.id,
    });

    const dados = await buscar(
      accessToken,
      '?tipo=RECEITA&dataInicio=2026-01-01&dataFim=2026-12-31',
    );

    expect(dados.itens).toHaveLength(1);
    expect(dados.itens[0]?.categoria.nome).toBe('Salário');
  });
});
