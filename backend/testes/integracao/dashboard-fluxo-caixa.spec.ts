import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarMovimentacao, fabricarTransferencia, prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface PontoFluxoCaixa {
  mes: string;
  rotulo: string;
  receitas: string;
  despesas: string;
  resultado: string;
}

interface RespostaFluxoCaixa {
  data: { fluxoCaixa: PontoFluxoCaixa[] };
}

async function buscarFluxoCaixa(accessToken: string, query = ''): Promise<PontoFluxoCaixa[]> {
  const resposta = await request(app)
    .get(`/api/v1/dashboard/fluxo-caixa${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(resposta.status).toBe(200);
  return (resposta.body as RespostaFluxoCaixa).data.fluxoCaixa;
}

describe('GET /dashboard/fluxo-caixa (issue #48)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('exige autenticacao', async () => {
    const resposta = await request(app).get('/api/v1/dashboard/fluxo-caixa');
    expect(resposta.status).toBe(401);
  });

  it('meses=48 responde 400 (maximo e 36)', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get('/api/v1/dashboard/fluxo-caixa?meses=48')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(400);
  });

  it('meses=0 responde 400', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get('/api/v1/dashboard/fluxo-caixa?meses=0')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(400);
  });

  it('sem nenhuma movimentacao, devolve exatamente `meses` pontos com "0.00", nao ausentes', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const pontos = await buscarFluxoCaixa(accessToken, '?meses=6');

    expect(pontos).toHaveLength(6);
    for (const ponto of pontos) {
      expect(ponto.receitas).toBe('0.00');
      expect(ponto.despesas).toBe('0.00');
      expect(ponto.resultado).toBe('0.00');
    }
  });

  it('rotulos em pt-BR, na ordem cronologica, com mes sem movimentacao intercalado', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    // Movimentacao so em maio e julho — junho precisa aparecer zerado,
    // nao ausente (o ponto central deste teste).
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '500.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-05-10',
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '200.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-10',
    });

    const pontos = await buscarFluxoCaixa(accessToken, '?meses=36');
    const mesMai = pontos.find((p) => p.mes === '2026-05');
    const mesJun = pontos.find((p) => p.mes === '2026-06');
    const mesJul = pontos.find((p) => p.mes === '2026-07');

    expect(mesMai).toMatchObject({ rotulo: 'mai/26', receitas: '500.00', resultado: '500.00' });
    expect(mesJun).toMatchObject({ rotulo: 'jun/26', receitas: '0.00', despesas: '0.00' });
    expect(mesJul).toMatchObject({ rotulo: 'jul/26', despesas: '200.00', resultado: '-200.00' });

    const indiceMai = pontos.findIndex((p) => p.mes === '2026-05');
    const indiceJun = pontos.findIndex((p) => p.mes === '2026-06');
    const indiceJul = pontos.findIndex((p) => p.mes === '2026-07');
    expect(indiceMai).toBeLessThan(indiceJun);
    expect(indiceJun).toBeLessThan(indiceJul);
  });

  it('exclui transferencias, canceladas, excluidas e modelos de recorrencia', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const destino = await prisma.conta.create({
      data: { usuarioId: usuario.id, nome: 'Destino', tipo: 'CARTEIRA' },
    });
    await fabricarTransferencia(usuario.id, conta.id, destino.id, {
      valor: '999.00',
      data: '2026-07-10',
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '888.00',
      situacao: 'CANCELADA',
      dataCompetencia: '2026-07-10',
    });
    const excluida = await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '777.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-10',
    });
    await prisma.movimentacao.update({
      where: { id: excluida.id },
      data: { excluidoEm: new Date() },
    });
    const modelo = await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '666.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-10',
    });
    await prisma.movimentacao.update({
      where: { id: modelo.id },
      data: { ehModeloRecorrencia: true, frequencia: 'MENSAL', intervaloRecorrencia: 1 },
    });

    const pontos = await buscarFluxoCaixa(accessToken, '?meses=36');
    const mesJul = pontos.find((p) => p.mes === '2026-07');

    expect(mesJul).toMatchObject({ receitas: '0.00', despesas: '0.00', resultado: '0.00' });
  });
});
