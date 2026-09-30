import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarCategoria, fabricarMovimentacao, prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface ItemPorCategoria {
  categoria: { id: string; nome: string; cor: string; icone: string };
  total: string;
  percentual: number;
  quantidade: number;
}

interface RespostaPorCategoria {
  data: { porCategoria: ItemPorCategoria[] };
}

interface RespostaIndicadores {
  data: { indicadores: { despesas: string } };
}

async function buscarPorCategoria(accessToken: string, query = ''): Promise<ItemPorCategoria[]> {
  const resposta = await request(app)
    .get(`/api/v1/dashboard/por-categoria${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(resposta.status).toBe(200);
  return (resposta.body as RespostaPorCategoria).data.porCategoria;
}

describe('GET /dashboard/por-categoria (issue #49)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('exige autenticacao', async () => {
    const resposta = await request(app).get('/api/v1/dashboard/por-categoria');
    expect(resposta.status).toBe(401);
  });

  it('rejeita dataInicio sem dataFim com 400', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get('/api/v1/dashboard/por-categoria?dataInicio=2026-07-01')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(400);
  });

  it('periodo sem despesas retorna array vazio, nao erro', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const itens = await buscarPorCategoria(
      accessToken,
      '?dataInicio=2026-07-01&dataFim=2026-07-31',
    );

    expect(itens).toEqual([]);
  });

  it('percentuais somam exatamente 100,00 quando ha dados, e a soma dos totais confere com o indicador de despesas', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const mercado = await fabricarCategoria(usuario.id, { nome: 'Mercado', tipo: 'DESPESA' });
    const transporte = await fabricarCategoria(usuario.id, { nome: 'Transporte', tipo: 'DESPESA' });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '100.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-05',
      categoriaId: mercado.id,
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '100.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-06',
      categoriaId: mercado.id,
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '100.00',
      situacao: 'PENDENTE',
      dataCompetencia: '2026-07-07',
      categoriaId: transporte.id,
    });

    const itens = await buscarPorCategoria(
      accessToken,
      '?dataInicio=2026-07-01&dataFim=2026-07-31',
    );
    const somaPercentuais = itens.reduce((soma, item) => soma + item.percentual, 0);
    const somaTotais = itens.reduce((soma, item) => soma + Number(item.total), 0);

    expect(somaPercentuais).toBe(100);
    expect(somaTotais.toFixed(2)).toBe('300.00');
    expect(itens[0]).toMatchObject({ categoria: { nome: 'Mercado' }, total: '200.00' });

    const indicadores = await request(app)
      .get('/api/v1/dashboard/indicadores?dataInicio=2026-07-01&dataFim=2026-07-31')
      .set('Authorization', `Bearer ${accessToken}`);
    expect((indicadores.body as RespostaIndicadores).data.indicadores.despesas).toBe(
      somaTotais.toFixed(2),
    );
  });

  it('agrupa subcategorias na raiz por padrao, mas detalha com incluirSubcategorias=true', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const raiz = await fabricarCategoria(usuario.id, { nome: 'Alimentação', tipo: 'DESPESA' });
    const sub = await fabricarCategoria(usuario.id, {
      nome: 'Restaurante',
      tipo: 'DESPESA',
      categoriaPaiId: raiz.id,
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '50.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-05',
      categoriaId: raiz.id,
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '30.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-06',
      categoriaId: sub.id,
    });

    const naRaiz = await buscarPorCategoria(
      accessToken,
      '?dataInicio=2026-07-01&dataFim=2026-07-31',
    );
    expect(naRaiz).toHaveLength(1);
    expect(naRaiz[0]).toMatchObject({
      categoria: { id: raiz.id, nome: 'Alimentação' },
      total: '80.00',
    });

    const detalhado = await buscarPorCategoria(
      accessToken,
      '?dataInicio=2026-07-01&dataFim=2026-07-31&incluirSubcategorias=true',
    );
    expect(detalhado).toHaveLength(2);
    expect(detalhado.find((i) => i.categoria.id === raiz.id)?.total).toBe('50.00');
    expect(detalhado.find((i) => i.categoria.id === sub.id)?.total).toBe('30.00');
  });

  it('movimentacoes sem categoria aparecem agrupadas como "Sem categoria"', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: 'DESPESA',
        descricao: 'Sem categoria definida',
        valor: '42.00',
        valorPago: '42.00',
        situacao: 'PAGA',
        dataCompetencia: new Date('2026-07-10'),
        dataEfetivacao: new Date('2026-07-10'),
      },
    });

    const itens = await buscarPorCategoria(
      accessToken,
      '?dataInicio=2026-07-01&dataFim=2026-07-31',
    );

    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({
      categoria: { id: 'sem-categoria', nome: 'Sem categoria' },
      total: '42.00',
      percentual: 100,
    });
  });

  it('usa DESPESA como tipo padrao e RECEITA quando informado', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const salario = await fabricarCategoria(usuario.id, { nome: 'Salário', tipo: 'RECEITA' });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '5000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-05',
      categoriaId: salario.id,
    });

    const despesas = await buscarPorCategoria(
      accessToken,
      '?dataInicio=2026-07-01&dataFim=2026-07-31',
    );
    expect(despesas).toEqual([]);

    const receitas = await buscarPorCategoria(
      accessToken,
      '?tipo=RECEITA&dataInicio=2026-07-01&dataFim=2026-07-31',
    );
    expect(receitas).toHaveLength(1);
    expect(receitas[0]).toMatchObject({ categoria: { nome: 'Salário' }, total: '5000.00' });
  });
});
