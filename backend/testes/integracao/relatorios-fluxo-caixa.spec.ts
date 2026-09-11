import { Prisma } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { paraDataIso } from '@/utilitarios/data';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarMovimentacao, fabricarTransferencia, prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface RespostaFluxoCaixa {
  data: {
    granularidade: string;
    saldoInicial: string;
    pontos: { data: string; delta: string; saldoAcumulado: string }[];
    saldoFinal: string;
  };
}

interface RespostaIndicadores {
  data: { indicadores: { saldoAtual: string } };
}

async function buscar(accessToken: string, query: string): Promise<RespostaFluxoCaixa['data']> {
  const resposta = await request(app)
    .get(`/api/v1/relatorios/fluxo-caixa${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(resposta.status).toBe(200);
  return (resposta.body as RespostaFluxoCaixa).data;
}

describe('GET /relatorios/fluxo-caixa (issue #52)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('exige autenticacao', async () => {
    const resposta = await request(app).get(
      '/api/v1/relatorios/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-12-31',
    );
    expect(resposta.status).toBe(401);
  });

  it('rejeita intervalo de mais de 5 anos com 400', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get('/api/v1/relatorios/fluxo-caixa?dataInicio=2015-01-01&dataFim=2026-01-01')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(400);
  });

  it('granularidade padrao e MENSAL; DIARIA devolve um ponto por dia', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const mensal = await buscar(accessToken, '?dataInicio=2026-01-01&dataFim=2026-12-31');
    expect(mensal.granularidade).toBe('MENSAL');
    expect(mensal.pontos).toHaveLength(12);

    const diaria = await buscar(
      accessToken,
      '?dataInicio=2026-01-01&dataFim=2026-01-31&granularidade=DIARIA',
    );
    expect(diaria.pontos).toHaveLength(31);
  });

  it('saldo acumulado do ultimo ponto termina no saldo atual consolidado', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const outraConta = await prisma.conta.create({
      data: { usuarioId: usuario.id, nome: 'Poupança', tipo: 'POUPANCA' },
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '1000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-01-10',
      dataEfetivacao: '2026-01-10',
    });
    await fabricarTransferencia(usuario.id, conta.id, outraConta.id, {
      valor: '200.00',
      data: '2026-02-05',
    });

    const hojeIso = paraDataIso(new Date());
    const dados = await buscar(accessToken, `?dataInicio=2026-01-01&dataFim=${hojeIso}`);
    const indicadores = await request(app)
      .get('/api/v1/dashboard/indicadores')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(dados.saldoFinal).toBe(
      (indicadores.body as RespostaIndicadores).data.indicadores.saldoAtual,
    );
  });

  it('delta inclui transferencias (RN-01), diferente de por-categoria/por-conta (RN-25)', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const outraConta = await prisma.conta.create({
      data: {
        usuarioId: usuario.id,
        nome: 'Destino',
        tipo: 'CARTEIRA',
        incluirNoSaldoTotal: false,
      },
    });
    await fabricarTransferencia(usuario.id, conta.id, outraConta.id, {
      valor: '150.00',
      data: '2026-03-15',
    });

    const dados = await buscar(accessToken, '?dataInicio=2026-01-01&dataFim=2026-12-31');
    const pontoMarco = dados.pontos.find((ponto) => ponto.data === '2026-03-01');

    expect(pontoMarco?.delta).toBe('-150.00');
  });

  it('responde em menos de 1200ms com granularidade diaria num intervalo de 1 ano', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const TOTAL_LINHAS = 3000;
    const linhas = Array.from({ length: TOTAL_LINHAS }, (_, indice) => {
      const dia = 1 + (indice % 27);
      const mes = indice % 12;
      const data = new Date(Date.UTC(2026, mes, dia));
      return {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: indice % 2 === 0 ? ('RECEITA' as const) : ('DESPESA' as const),
        descricao: `Movimentação de carga ${indice}`,
        valor: new Prisma.Decimal('10.00'),
        valorPago: new Prisma.Decimal('10.00'),
        situacao: 'PAGA' as const,
        dataCompetencia: data,
        dataEfetivacao: data,
      };
    });
    await prisma.movimentacao.createMany({ data: linhas });

    const inicio = Date.now();
    const resposta = await request(app)
      .get(
        '/api/v1/relatorios/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-12-31&granularidade=DIARIA',
      )
      .set('Authorization', `Bearer ${accessToken}`);
    const duracaoMs = Date.now() - inicio;

    expect(resposta.status).toBe(200);
    expect(duracaoMs).toBeLessThan(1200);
  }, 15_000);
});
