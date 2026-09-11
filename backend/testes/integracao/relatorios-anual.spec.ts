import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarMovimentacao, prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface RespostaAnual {
  data: {
    ano: number;
    resumo: {
      receitas: string;
      despesas: string;
      resultado: string;
      mediaMensalReceitas: string;
      mediaMensalDespesas: string;
      taxaPoupancaMedia: number;
    };
    porMes: {
      mes: number;
      rotulo: string;
      receitas: string;
      despesas: string;
      resultado: string;
    }[];
    porCategoria: { categoria: { nome: string }; total: string; mediaMensal: string }[];
    melhorMes: { mes: number; resultado: string };
    piorMes: { mes: number; resultado: string };
  };
}

async function buscarAnual(accessToken: string, ano: number): Promise<RespostaAnual['data']> {
  const resposta = await request(app)
    .get(`/api/v1/relatorios/anual?ano=${ano}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(resposta.status).toBe(200);
  return (resposta.body as RespostaAnual).data;
}

describe('GET /relatorios/anual (issue #51)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('exige autenticacao', async () => {
    const resposta = await request(app).get('/api/v1/relatorios/anual?ano=2026');
    expect(resposta.status).toBe(401);
  });

  it.each([
    ['ano=1999', '?ano=1999'],
    ['ano=2101', '?ano=2101'],
    ['sem ano', ''],
  ])('rejeita %s com 400', async (_nome, query) => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get(`/api/v1/relatorios/anual${query}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(400);
  });

  it('ano sem movimentacao retorna zeros, nao erro, com os 12 meses presentes', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const dados = await buscarAnual(accessToken, 2026);

    expect(dados.porMes).toHaveLength(12);
    expect(dados.resumo.receitas).toBe('0.00');
    expect(dados.resumo.taxaPoupancaMedia).toBe(0);
    expect(Number.isFinite(dados.resumo.taxaPoupancaMedia)).toBe(true);
  });

  it('soma dos 12 meses confere com o total anual', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '1000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-03-10',
      dataEfetivacao: '2026-03-10',
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '2000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-09-10',
      dataEfetivacao: '2026-09-10',
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '400.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-09-15',
      dataEfetivacao: '2026-09-15',
    });

    const dados = await buscarAnual(accessToken, 2026);

    const somaReceitasMeses = dados.porMes.reduce((soma, item) => soma + Number(item.receitas), 0);
    const somaDespesasMeses = dados.porMes.reduce((soma, item) => soma + Number(item.despesas), 0);
    expect(somaReceitasMeses.toFixed(2)).toBe(dados.resumo.receitas);
    expect(somaDespesasMeses.toFixed(2)).toBe(dados.resumo.despesas);
    expect(dados.resumo.receitas).toBe('3000.00');
    expect(dados.resumo.despesas).toBe('400.00');
    expect(dados.resumo.mediaMensalReceitas).toBe((3000 / 12).toFixed(2));
  });

  it('identifica melhorMes e piorMes pelo resultado', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '5000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-10',
      dataEfetivacao: '2026-07-10',
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '3000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-03-10',
      dataEfetivacao: '2026-03-10',
    });

    const dados = await buscarAnual(accessToken, 2026);

    expect(dados.melhorMes.mes).toBe(7);
    expect(dados.melhorMes.resultado).toBe('5000.00');
    expect(dados.piorMes.mes).toBe(3);
    expect(dados.piorMes.resultado).toBe('-3000.00');
  });

  it('porMes traz rotulo abreviado em pt-BR, sem ano, em ordem cronologica', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const dados = await buscarAnual(accessToken, 2026);

    expect(dados.porMes[0]).toMatchObject({ mes: 1, rotulo: 'jan' });
    expect(dados.porMes[6]).toMatchObject({ mes: 7, rotulo: 'jul' });
    expect(dados.porMes[11]).toMatchObject({ mes: 12, rotulo: 'dez' });
  });

  it('porCategoria.mediaMensal = total / 12', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const mercado = await prisma.categoria.create({
      data: { usuarioId: usuario.id, nome: 'Mercado', tipo: 'DESPESA' },
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '1200.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-05-10',
      dataEfetivacao: '2026-05-10',
      categoriaId: mercado.id,
    });

    const dados = await buscarAnual(accessToken, 2026);

    expect(dados.porCategoria[0]).toMatchObject({
      categoria: { nome: 'Mercado' },
      total: '1200.00',
      mediaMensal: '100.00',
    });
  });
});
