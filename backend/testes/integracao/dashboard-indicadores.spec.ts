import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarMovimentacao, fabricarTransferencia, prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface RespostaIndicadores {
  data: {
    periodo: { dataInicio: string; dataFim: string; rotulo: string };
    indicadores: {
      saldoAtual: string;
      receitas: string;
      despesas: string;
      resultado: string;
      saldoPrevisto: string;
      variacaoReceitas: number;
      variacaoDespesas: number;
      taxaPoupanca: number;
    };
  };
}

interface RespostaListagem {
  meta: { totalizadores: { receitas: string; despesas: string; resultado: string } };
}

async function buscarIndicadores(
  accessToken: string,
  query = '',
): Promise<RespostaIndicadores['data']> {
  const resposta = await request(app)
    .get(`/api/v1/dashboard/indicadores${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(resposta.status).toBe(200);
  return (resposta.body as RespostaIndicadores).data;
}

describe('GET /dashboard/indicadores (issue #47)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('exige autenticacao', async () => {
    const resposta = await request(app).get('/api/v1/dashboard/indicadores');
    expect(resposta.status).toBe(401);
  });

  it('rejeita dataInicio sem dataFim (e vice-versa) com 400', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const semDataFim = await request(app)
      .get('/api/v1/dashboard/indicadores?dataInicio=2026-07-01')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(semDataFim.status).toBe(400);

    const semDataInicio = await request(app)
      .get('/api/v1/dashboard/indicadores?dataFim=2026-07-31')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(semDataInicio.status).toBe(400);
  });

  it('rejeita dataInicio posterior a dataFim com 400', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get('/api/v1/dashboard/indicadores?dataInicio=2026-07-31&dataFim=2026-07-01')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(400);
  });

  it('sem dataInicio/dataFim, o periodo padrao e um mes completo', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const { periodo } = await buscarIndicadores(accessToken);

    const dataInicio = new Date(`${periodo.dataInicio}T00:00:00.000Z`);
    const dataFim = new Date(`${periodo.dataFim}T00:00:00.000Z`);
    expect(dataInicio.getUTCDate()).toBe(1);
    const ultimoDiaEsperado = new Date(
      Date.UTC(dataFim.getUTCFullYear(), dataFim.getUTCMonth() + 1, 0),
    ).getUTCDate();
    expect(dataFim.getUTCDate()).toBe(ultimoDiaEsperado);
    expect(periodo.rotulo).toMatch(/^[A-ZÇ][a-zçãáéíóõôê]+ de \d{4}$/);
  });

  it('indicadores conferem com os totalizadores da listagem para o mesmo filtro', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '1000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-10',
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '300.00',
      situacao: 'PENDENTE',
      dataCompetencia: '2026-07-15',
    });

    const { indicadores } = await buscarIndicadores(
      accessToken,
      '?dataInicio=2026-07-01&dataFim=2026-07-31',
    );
    const listagem = await request(app)
      .get('/api/v1/movimentacoes?dataInicio=2026-07-01&dataFim=2026-07-31&limite=1')
      .set('Authorization', `Bearer ${accessToken}`);
    const totalizadores = (listagem.body as RespostaListagem).meta.totalizadores;

    expect(indicadores.receitas).toBe(totalizadores.receitas);
    expect(indicadores.despesas).toBe(totalizadores.despesas);
    expect(indicadores.resultado).toBe(totalizadores.resultado);
    expect(indicadores.receitas).toBe('1000.00');
    expect(indicadores.despesas).toBe('300.00');
  });

  it('transferencias nao entram em receitas/despesas (RN-25), mas afetam o saldoAtual (RN-01)', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    // incluirNoSaldoTotal=false no destino: isola o efeito da transferencia
    // na conta de origem — se o destino tambem contasse, o total do
    // usuario ficaria zerado (dinheiro so mudou de bolso) e nao provaria
    // que a transferencia afetou o saldo agregado.
    const destino = await prisma.conta.create({
      data: {
        usuarioId: usuario.id,
        nome: 'Destino',
        tipo: 'CARTEIRA',
        incluirNoSaldoTotal: false,
      },
    });
    await fabricarTransferencia(usuario.id, conta.id, destino.id, {
      valor: '200.00',
      data: '2026-07-10',
    });

    const { indicadores } = await buscarIndicadores(
      accessToken,
      '?dataInicio=2026-07-01&dataFim=2026-07-31',
    );

    expect(indicadores.receitas).toBe('0.00');
    expect(indicadores.despesas).toBe('0.00');
    expect(indicadores.saldoAtual).toBe('-200.00');
  });

  it('receitas zero no periodo produz taxaPoupanca 0, nunca NaN/Infinity', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '150.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-10',
    });

    const { indicadores } = await buscarIndicadores(
      accessToken,
      '?dataInicio=2026-07-01&dataFim=2026-07-31',
    );

    expect(indicadores.receitas).toBe('0.00');
    expect(indicadores.taxaPoupanca).toBe(0);
    expect(Number.isFinite(indicadores.taxaPoupanca)).toBe(true);
  });

  it('calcula a variacao contra o periodo anterior de mesma duracao, cruzando fevereiro', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    // Periodo atual: marco/2026 (31 dias). Anterior de MESMA DURACAO recua
    // 31 dias a partir de 28/02/2026, terminando em 29/01/2026 — nao
    // "fevereiro inteiro" (28 dias, o que dariam datas diferentes).
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '1100.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-03-10',
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '1000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-02-10',
    });

    const { indicadores } = await buscarIndicadores(
      accessToken,
      '?dataInicio=2026-03-01&dataFim=2026-03-31',
    );

    expect(indicadores.variacaoReceitas).toBe(10);
  });

  it('rejeita contaCompartilhadaId com 400 (M6 ainda nao existe)', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .get('/api/v1/dashboard/indicadores?contaCompartilhadaId=algum-id')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(400);
  });
});
