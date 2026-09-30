import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarMovimentacao, prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface RespostaPorConta {
  data: {
    itens: {
      conta: { id: string; nome: string };
      receitas: string;
      despesas: string;
      resultado: string;
      saldoInicial: string;
      saldoFinal: string;
    }[];
    totais: { receitas: string; despesas: string; resultado: string };
  };
}

async function buscar(accessToken: string, query: string): Promise<RespostaPorConta['data']> {
  const resposta = await request(app)
    .get(`/api/v1/relatorios/por-conta${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(resposta.status).toBe(200);
  return (resposta.body as RespostaPorConta).data;
}

describe('GET /relatorios/por-conta (issue #52)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('exige autenticacao', async () => {
    const resposta = await request(app).get(
      '/api/v1/relatorios/por-conta?dataInicio=2026-01-01&dataFim=2026-12-31',
    );
    expect(resposta.status).toBe(401);
  });

  it('rejeita dataInicio > dataFim com 400', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get('/api/v1/relatorios/por-conta?dataInicio=2026-12-31&dataFim=2026-01-01')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(400);
  });

  it('soma por conta confere com o total geral do periodo', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const outraConta = await prisma.conta.create({
      data: { usuarioId: usuario.id, nome: 'Poupança', tipo: 'POUPANCA', saldoInicial: '500.00' },
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '1000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-05-05',
      dataEfetivacao: '2026-05-05',
    });
    await fabricarMovimentacao(usuario.id, outraConta.id, {
      tipo: 'DESPESA',
      valor: '300.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-06-05',
      dataEfetivacao: '2026-06-05',
    });

    const dados = await buscar(accessToken, '?dataInicio=2026-01-01&dataFim=2026-12-31');

    const somaReceitas = dados.itens.reduce((soma, item) => soma + Number(item.receitas), 0);
    const somaDespesas = dados.itens.reduce((soma, item) => soma + Number(item.despesas), 0);
    expect(somaReceitas.toFixed(2)).toBe(dados.totais.receitas);
    expect(somaDespesas.toFixed(2)).toBe(dados.totais.despesas);
    expect(dados.totais.receitas).toBe('1000.00');
    expect(dados.totais.despesas).toBe('300.00');

    const itemPoupanca = dados.itens.find((item) => item.conta.nome === 'Poupança');
    expect(itemPoupanca?.saldoInicial).toBe('500.00');
    expect(itemPoupanca?.saldoFinal).toBe('200.00');
  });

  it('conta sem nenhuma movimentacao no periodo nao aparece nos itens', async () => {
    const { accessToken, usuario } = await prepararUsuarioComConta();
    await prisma.conta.create({
      data: { usuarioId: usuario.id, nome: 'Vazia', tipo: 'CARTEIRA' },
    });

    const dados = await buscar(accessToken, '?dataInicio=2026-01-01&dataFim=2026-12-31');

    expect(dados.itens.find((item) => item.conta.nome === 'Vazia')).toBeUndefined();
  });
});
