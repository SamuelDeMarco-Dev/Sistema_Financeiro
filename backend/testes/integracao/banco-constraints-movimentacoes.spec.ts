import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { limparBanco } from '../configuracao/banco-teste';

async function criarUsuario(email: string): Promise<{ id: string }> {
  return prisma.usuario.create({
    data: { nome: 'Usuaria de Teste', email, senhaHash: 'hash-fake' },
  });
}

async function criarConta(usuarioId: string): Promise<{ id: string }> {
  return prisma.conta.create({ data: { usuarioId, nome: 'Carteira', tipo: 'CARTEIRA' } });
}

interface DadosMovimentacaoMinima {
  usuarioId: string;
  contaId?: string | null;
  tipo?: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
  valor?: string;
  valorPago?: string;
  situacao?: 'PENDENTE' | 'PAGA' | 'PAGA_PARCIALMENTE' | 'ATRASADA' | 'CANCELADA';
  dataEfetivacao?: Date | null;
  sentido?: 'SAIDA' | 'ENTRADA' | null;
  transferenciaId?: string | null;
  compraParceladaId?: string | null;
  numeroParcela?: number | null;
  totalParcelas?: number | null;
  ehModeloRecorrencia?: boolean;
  frequencia?:
    | 'DIARIA'
    | 'SEMANAL'
    | 'QUINZENAL'
    | 'MENSAL'
    | 'BIMESTRAL'
    | 'TRIMESTRAL'
    | 'SEMESTRAL'
    | 'ANUAL'
    | null;
  recorrenciaId?: string | null;
}

function movimentacaoMinima(
  dados: DadosMovimentacaoMinima,
): Parameters<typeof prisma.movimentacao.create>[0]['data'] {
  return {
    usuarioId: dados.usuarioId,
    contaId: dados.contaId ?? null,
    tipo: dados.tipo ?? 'DESPESA',
    descricao: 'Movimentacao de teste',
    valor: dados.valor ?? '100.00',
    valorPago: dados.valorPago ?? '0.00',
    situacao: dados.situacao ?? 'PENDENTE',
    dataCompetencia: new Date('2026-08-05'),
    dataEfetivacao: dados.dataEfetivacao ?? null,
    sentido: dados.sentido ?? null,
    transferenciaId: dados.transferenciaId ?? null,
    compraParceladaId: dados.compraParceladaId ?? null,
    numeroParcela: dados.numeroParcela ?? null,
    totalParcelas: dados.totalParcelas ?? null,
    ehModeloRecorrencia: dados.ehModeloRecorrencia ?? false,
    frequencia: dados.frequencia ?? null,
    recorrenciaId: dados.recorrenciaId ?? null,
  };
}

describe('banco: constraints de dominio de Movimentacao (issue #33)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('RN-09: movimentacao sem conta_id viola chk_mov_escopo', async () => {
    const usuario = await criarUsuario('rn09@exemplo.com');

    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({ usuarioId: usuario.id, contaId: null }),
      }),
    ).rejects.toThrow(/chk_mov_escopo/);
  });

  it('RN-08: valor = 0 viola chk_mov_valor_positivo', async () => {
    const usuario = await criarUsuario('rn08-zero@exemplo.com');
    const conta = await criarConta(usuario.id);

    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({ usuarioId: usuario.id, contaId: conta.id, valor: '0.00' }),
      }),
    ).rejects.toThrow(/chk_mov_valor_positivo/);
  });

  it('RN-08: valor negativo viola chk_mov_valor_positivo', async () => {
    const usuario = await criarUsuario('rn08-negativo@exemplo.com');
    const conta = await criarConta(usuario.id);

    // Um valor negativo tambem torna valor_pago (default 0) maior que
    // valor, violando chk_mov_valor_pago ao mesmo tempo — o Postgres pode
    // reportar qualquer uma das duas, ambas legitimas para esta linha.
    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({ usuarioId: usuario.id, contaId: conta.id, valor: '-10.00' }),
      }),
    ).rejects.toThrow(/chk_mov_valor_positivo|chk_mov_valor_pago/);
  });

  it('chk_mov_valor_pago: valor_pago maior que valor viola a constraint', async () => {
    const usuario = await criarUsuario('valor-pago@exemplo.com');
    const conta = await criarConta(usuario.id);

    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({
          usuarioId: usuario.id,
          contaId: conta.id,
          valor: '100.00',
          valorPago: '150.00',
        }),
      }),
    ).rejects.toThrow(/chk_mov_valor_pago/);
  });

  it('chk_mov_sentido_transferencia: TRANSFERENCIA sem sentido viola a constraint', async () => {
    const usuario = await criarUsuario('transferencia-sem-sentido@exemplo.com');
    const conta = await criarConta(usuario.id);

    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({
          usuarioId: usuario.id,
          contaId: conta.id,
          tipo: 'TRANSFERENCIA',
        }),
      }),
    ).rejects.toThrow(/chk_mov_sentido_transferencia/);
  });

  it('chk_mov_sentido_transferencia: DESPESA com sentido viola a constraint', async () => {
    const usuario = await criarUsuario('despesa-com-sentido@exemplo.com');
    const conta = await criarConta(usuario.id);

    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({ usuarioId: usuario.id, contaId: conta.id, sentido: 'SAIDA' }),
      }),
    ).rejects.toThrow(/chk_mov_sentido_transferencia/);
  });

  it('RN-14: PAGA sem data_efetivacao viola chk_mov_efetivacao', async () => {
    const usuario = await criarUsuario('paga-sem-efetivacao@exemplo.com');
    const conta = await criarConta(usuario.id);

    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({ usuarioId: usuario.id, contaId: conta.id, situacao: 'PAGA' }),
      }),
    ).rejects.toThrow(/chk_mov_efetivacao/);
  });

  it('RN-02: PENDENTE com data_efetivacao viola chk_mov_efetivacao', async () => {
    const usuario = await criarUsuario('pendente-com-efetivacao@exemplo.com');
    const conta = await criarConta(usuario.id);

    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({
          usuarioId: usuario.id,
          contaId: conta.id,
          situacao: 'PENDENTE',
          dataEfetivacao: new Date('2026-08-05'),
        }),
      }),
    ).rejects.toThrow(/chk_mov_efetivacao/);
  });

  it('RN-22: numero_parcela sem compra_parcelada_id viola chk_mov_parcelamento', async () => {
    const usuario = await criarUsuario('parcela-sem-compra@exemplo.com');
    const conta = await criarConta(usuario.id);

    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({
          usuarioId: usuario.id,
          contaId: conta.id,
          numeroParcela: 1,
          totalParcelas: 3,
        }),
      }),
    ).rejects.toThrow(/chk_mov_parcelamento/);
  });

  it('RN-22: numero_parcela fora do intervalo 1..total_parcelas viola chk_mov_parcelamento', async () => {
    const usuario = await criarUsuario('parcela-fora-intervalo@exemplo.com');
    const conta = await criarConta(usuario.id);
    const compra = await prisma.compraParcelada.create({
      data: {
        usuarioId: usuario.id,
        descricao: 'Compra',
        valorTotal: '300.00',
        totalParcelas: 3,
        dataCompra: new Date('2026-08-05'),
      },
    });

    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({
          usuarioId: usuario.id,
          contaId: conta.id,
          compraParceladaId: compra.id,
          numeroParcela: 4,
          totalParcelas: 3,
        }),
      }),
    ).rejects.toThrow(/chk_mov_parcelamento/);
  });

  it('RN-17: modelo de recorrencia sem frequencia viola chk_mov_recorrencia', async () => {
    const usuario = await criarUsuario('modelo-sem-frequencia@exemplo.com');
    const conta = await criarConta(usuario.id);

    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({
          usuarioId: usuario.id,
          contaId: conta.id,
          ehModeloRecorrencia: true,
        }),
      }),
    ).rejects.toThrow(/chk_mov_recorrencia/);
  });

  it('RN-17: modelo de recorrencia nao pode ser filho de outro modelo (viola chk_mov_recorrencia)', async () => {
    const usuario = await criarUsuario('modelo-filho@exemplo.com');
    const conta = await criarConta(usuario.id);
    const modelo = await prisma.movimentacao.create({
      data: movimentacaoMinima({
        usuarioId: usuario.id,
        contaId: conta.id,
        ehModeloRecorrencia: true,
        frequencia: 'MENSAL',
      }),
    });

    await expect(
      prisma.movimentacao.create({
        data: movimentacaoMinima({
          usuarioId: usuario.id,
          contaId: conta.id,
          ehModeloRecorrencia: true,
          frequencia: 'MENSAL',
          recorrenciaId: modelo.id,
        }),
      }),
    ).rejects.toThrow(/chk_mov_recorrencia/);
  });

  it('RN-21: compra parcelada com menos de 2 parcelas viola chk_compra_parcelas', async () => {
    const usuario = await criarUsuario('compra-1-parcela@exemplo.com');

    await expect(
      prisma.compraParcelada.create({
        data: {
          usuarioId: usuario.id,
          descricao: 'Compra invalida',
          valorTotal: '100.00',
          totalParcelas: 1,
          dataCompra: new Date('2026-08-05'),
        },
      }),
    ).rejects.toThrow(/chk_compra_parcelas/);
  });

  it('RN-21: compra parcelada com valor_total nao positivo viola chk_compra_parcelas', async () => {
    const usuario = await criarUsuario('compra-valor-zero@exemplo.com');

    await expect(
      prisma.compraParcelada.create({
        data: {
          usuarioId: usuario.id,
          descricao: 'Compra invalida',
          valorTotal: '0.00',
          totalParcelas: 3,
          dataCompra: new Date('2026-08-05'),
        },
      }),
    ).rejects.toThrow(/chk_compra_parcelas/);
  });

  it('existem os indices parciais idx_mov_saldo e idx_mov_pendentes_vencimento', async () => {
    const indices = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'movimentacoes'
    `;
    const nomes = new Set(indices.map((i) => i.indexname));

    expect(nomes.has('idx_mov_saldo')).toBe(true);
    expect(nomes.has('idx_mov_pendentes_vencimento')).toBe(true);
  });
});
