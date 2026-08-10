import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarMovimentacao, fabricarTransferencia, prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface RespostaMensal {
  data: {
    periodo: { ano: number; mes: number; rotulo: string };
    resumo: {
      receitas: string;
      despesas: string;
      resultado: string;
      saldoInicial: string;
      saldoFinal: string;
    };
    porCategoria: {
      receitas: { categoria: { nome: string; cor: string }; total: string; percentual: number }[];
      despesas: { categoria: { nome: string; cor: string }; total: string; percentual: number }[];
    };
    porConta: { conta: { nome: string }; receitas: string; despesas: string; resultado: string }[];
    porDia: { data: string; receitas: string; despesas: string; resultado: string }[];
    maioresDespesas: { id: string; descricao: string; valor: string; data: string }[];
    comparativoMesAnterior: {
      receitas: { atual: string; anterior: string; variacao: number };
      despesas: { atual: string; anterior: string; variacao: number };
    };
  };
}

async function buscarMensal(
  accessToken: string,
  ano: number,
  mes: number,
): Promise<RespostaMensal['data']> {
  const resposta = await request(app)
    .get(`/api/v1/relatorios/mensal?ano=${ano}&mes=${mes}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(resposta.status).toBe(200);
  return (resposta.body as RespostaMensal).data;
}

describe('GET /relatorios/mensal (issue #51)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('exige autenticacao', async () => {
    const resposta = await request(app).get('/api/v1/relatorios/mensal?ano=2026&mes=7');
    expect(resposta.status).toBe(401);
  });

  it.each([
    ['mes=13', '?ano=2026&mes=13'],
    ['mes=0', '?ano=2026&mes=0'],
    ['ano=1999', '?ano=1999&mes=7'],
    ['ano=2101', '?ano=2101&mes=7'],
    ['sem ano', '?mes=7'],
    ['sem mes', '?ano=2026'],
  ])('rejeita %s com 400', async (_nome, query) => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get(`/api/v1/relatorios/mensal${query}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(400);
  });

  it('periodo sem movimentacao retorna zeros, nao erro; saldoFinal = saldoInicial', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const dados = await buscarMensal(accessToken, 2026, 7);

    expect(dados.resumo.receitas).toBe('0.00');
    expect(dados.resumo.despesas).toBe('0.00');
    expect(dados.resumo.saldoInicial).toBe(dados.resumo.saldoFinal);
    expect(dados.porCategoria.despesas).toEqual([]);
    expect(dados.porDia).toEqual([]);
    expect(dados.maioresDespesas).toEqual([]);
  });

  it('saldoFinal = saldoInicial + resultado, com receita, despesa parcial e transferencia interna', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const outraConta = await prisma.conta.create({
      data: { usuarioId: usuario.id, nome: 'Poupança', tipo: 'POUPANCA' },
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '1000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-05',
      dataEfetivacao: '2026-07-05',
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '300.00',
      valorPago: '120.00',
      situacao: 'PAGA_PARCIALMENTE',
      dataCompetencia: '2026-07-06',
      dataEfetivacao: '2026-07-06',
    });
    // Pendente: nao efetivou, nao pode entrar no resultado do extrato.
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '999.00',
      situacao: 'PENDENTE',
      dataCompetencia: '2026-07-07',
    });
    await fabricarTransferencia(usuario.id, conta.id, outraConta.id, {
      valor: '200.00',
      data: '2026-07-08',
    });

    const dados = await buscarMensal(accessToken, 2026, 7);

    // resultado = 1000 (receita) - 120 (parcial) = 880; transferencia
    // interna nao entra no resultado (RN-25) mas tambem nao desequilibra
    // saldoFinal, porque as duas contas sao do mesmo usuario (soma zero).
    expect(dados.resumo.receitas).toBe('1000.00');
    expect(dados.resumo.despesas).toBe('120.00');
    expect(dados.resumo.resultado).toBe('880.00');
    const saldoInicial = Number(dados.resumo.saldoInicial);
    const saldoFinal = Number(dados.resumo.saldoFinal);
    expect((saldoFinal - saldoInicial).toFixed(2)).toBe('880.00');
  });

  it('confere valor a valor: soma de porCategoria, porConta e porDia bate com resumo.despesas', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const mercado = await prisma.categoria.create({
      data: { usuarioId: usuario.id, nome: 'Mercado', tipo: 'DESPESA' },
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '150.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-10',
      dataEfetivacao: '2026-07-10',
      categoriaId: mercado.id,
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '50.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-11',
      dataEfetivacao: '2026-07-11',
      categoriaId: mercado.id,
    });

    const dados = await buscarMensal(accessToken, 2026, 7);

    const somaPorCategoria = dados.porCategoria.despesas.reduce(
      (soma, item) => soma + Number(item.total),
      0,
    );
    const somaPorConta = dados.porConta.reduce((soma, item) => soma + Number(item.despesas), 0);
    const somaPorDia = dados.porDia.reduce((soma, item) => soma + Number(item.despesas), 0);

    expect(somaPorCategoria.toFixed(2)).toBe(dados.resumo.despesas);
    expect(somaPorConta.toFixed(2)).toBe(dados.resumo.despesas);
    expect(somaPorDia.toFixed(2)).toBe(dados.resumo.despesas);
    expect(dados.resumo.despesas).toBe('200.00');
  });

  it('transferencias sao excluidas de porCategoria, porConta e porDia', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const outraConta = await prisma.conta.create({
      data: { usuarioId: usuario.id, nome: 'Poupança', tipo: 'POUPANCA' },
    });
    await fabricarTransferencia(usuario.id, conta.id, outraConta.id, {
      valor: '500.00',
      data: '2026-07-15',
    });

    const dados = await buscarMensal(accessToken, 2026, 7);

    expect(dados.porCategoria.despesas).toEqual([]);
    expect(dados.porConta).toEqual([]);
    expect(dados.porDia).toEqual([]);
  });

  it('maioresDespesas lista no maximo 10, em ordem decrescente de valor pago', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    for (let indice = 1; indice <= 12; indice += 1) {
      await fabricarMovimentacao(usuario.id, conta.id, {
        tipo: 'DESPESA',
        descricao: `Despesa ${indice}`,
        valor: `${indice * 10}.00`,
        situacao: 'PAGA',
        dataCompetencia: '2026-07-01',
        dataEfetivacao: '2026-07-01',
      });
    }

    const dados = await buscarMensal(accessToken, 2026, 7);

    expect(dados.maioresDespesas).toHaveLength(10);
    expect(dados.maioresDespesas[0]?.valor).toBe('120.00');
    expect(dados.maioresDespesas[9]?.valor).toBe('30.00');
  });

  it('comparativoMesAnterior calcula a variacao contra o mes de calendario anterior', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '1100.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-05',
      dataEfetivacao: '2026-07-05',
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '1000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-06-05',
      dataEfetivacao: '2026-06-05',
    });

    const dados = await buscarMensal(accessToken, 2026, 7);

    expect(dados.comparativoMesAnterior.receitas.atual).toBe('1100.00');
    expect(dados.comparativoMesAnterior.receitas.anterior).toBe('1000.00');
    expect(dados.comparativoMesAnterior.receitas.variacao).toBe(10);
  });

  it('janeiro compara com dezembro do ANO ANTERIOR', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '500.00',
      situacao: 'PAGA',
      dataCompetencia: '2025-12-20',
      dataEfetivacao: '2025-12-20',
    });

    const dados = await buscarMensal(accessToken, 2026, 1);

    expect(dados.comparativoMesAnterior.receitas.anterior).toBe('500.00');
  });
});
