import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { limparBanco } from '../configuracao/banco-teste';

async function criarUsuario(email: string): Promise<{ id: string }> {
  return prisma.usuario.create({
    data: { nome: 'Usuaria de Teste', email, senhaHash: 'hash-fake' },
  });
}

async function criarConta(usuarioId: string, nome = 'Carteira'): Promise<{ id: string }> {
  return prisma.conta.create({ data: { usuarioId, nome, tipo: 'CARTEIRA' } });
}

async function criarCategoria(usuarioId: string, nome = 'Lazer'): Promise<{ id: string }> {
  return prisma.categoria.create({ data: { usuarioId, nome, tipo: 'DESPESA' } });
}

// Cobre apenas o que a issue #32 promete (tabelas, tipos de coluna,
// indices, FKs e a auto-relacao de recorrencia). Os CHECKs de dominio
// (valor > 0, escopo, coerencia de estado etc., issue #33) tem sua
// propria suite em banco-constraints-movimentacoes.spec.ts.
describe('banco: Movimentacao, Anexo, CompraParcelada', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('valor e valor_pago sao numeric(14,2); data_competencia e date, nao timestamp', async () => {
    const colunas = await prisma.$queryRaw<
      {
        column_name: string;
        data_type: string;
        numeric_precision: number | null;
        numeric_scale: number | null;
      }[]
    >`
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'movimentacoes'
        AND column_name IN ('valor', 'valor_pago', 'data_competencia')
    `;

    const valor = colunas.find((c) => c.column_name === 'valor');
    const valorPago = colunas.find((c) => c.column_name === 'valor_pago');
    const dataCompetencia = colunas.find((c) => c.column_name === 'data_competencia');

    expect(valor?.data_type).toBe('numeric');
    expect(valor?.numeric_precision).toBe(14);
    expect(valor?.numeric_scale).toBe(2);
    expect(valorPago?.data_type).toBe('numeric');
    expect(dataCompetencia?.data_type).toBe('date');
  });

  it('auto-relacao funciona: modelo de recorrencia com ocorrencias filhas', async () => {
    const usuario = await criarUsuario('recorrencia@exemplo.com');
    const conta = await criarConta(usuario.id);

    const modelo = await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: 'DESPESA',
        descricao: 'Aluguel',
        valor: '1500.00',
        dataCompetencia: new Date('2026-08-01'),
        ehModeloRecorrencia: true,
        frequencia: 'MENSAL',
      },
    });

    const ocorrencia = await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: 'DESPESA',
        descricao: 'Aluguel',
        valor: '1500.00',
        dataCompetencia: new Date('2026-09-01'),
        recorrenciaId: modelo.id,
      },
    });

    const modeloComOcorrencias = await prisma.movimentacao.findUnique({
      where: { id: modelo.id },
      include: { ocorrencias: true },
    });

    expect(modeloComOcorrencias?.ocorrencias).toHaveLength(1);
    expect(modeloComOcorrencias?.ocorrencias[0]?.id).toBe(ocorrencia.id);
  });

  it('excluir o modelo de recorrencia exclui as ocorrencias em cascata', async () => {
    const usuario = await criarUsuario('cascata-recorrencia@exemplo.com');
    const conta = await criarConta(usuario.id);
    const modelo = await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: 'DESPESA',
        descricao: 'Assinatura',
        valor: '50.00',
        dataCompetencia: new Date('2026-08-01'),
        ehModeloRecorrencia: true,
        frequencia: 'MENSAL',
      },
    });
    const ocorrencia = await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: 'DESPESA',
        descricao: 'Assinatura',
        valor: '50.00',
        dataCompetencia: new Date('2026-09-01'),
        recorrenciaId: modelo.id,
      },
    });

    await prisma.movimentacao.delete({ where: { id: modelo.id } });

    await expect(
      prisma.movimentacao.findUnique({ where: { id: ocorrencia.id } }),
    ).resolves.toBeNull();
  });

  it('existem os 10 indices de movimentacoes dirigidos as consultas de listagem/saldo', async () => {
    const indices = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'movimentacoes'
    `;
    const nomes = new Set(indices.map((i) => i.indexname));

    const esperados = [
      'movimentacoes_conta_id_situacao_data_efetivacao_idx',
      'movimentacoes_usuario_id_data_competencia_tipo_idx',
      'movimentacoes_conta_compartilhada_id_data_competencia_idx',
      'movimentacoes_categoria_id_data_competencia_idx',
      'movimentacoes_situacao_data_vencimento_idx',
      'movimentacoes_transferencia_id_idx',
      'movimentacoes_recorrencia_id_idx',
      'movimentacoes_compra_parcelada_id_idx',
      'movimentacoes_fatura_id_idx',
      'movimentacoes_excluido_em_idx',
    ];

    for (const esperado of esperados) {
      expect(nomes.has(esperado)).toBe(true);
    }
  });

  it('onDelete Restrict em conta impede excluir conta com movimentacoes', async () => {
    const usuario = await criarUsuario('restrict-conta@exemplo.com');
    const conta = await criarConta(usuario.id);
    await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: 'RECEITA',
        descricao: 'Salário',
        valor: '3000.00',
        dataCompetencia: new Date('2026-08-05'),
      },
    });

    await expect(prisma.conta.delete({ where: { id: conta.id } })).rejects.toThrow();
  });

  it('onDelete Restrict em categoria impede excluir categoria com movimentacoes', async () => {
    const usuario = await criarUsuario('restrict-categoria@exemplo.com');
    const conta = await criarConta(usuario.id);
    const categoria = await criarCategoria(usuario.id);
    await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        categoriaId: categoria.id,
        tipo: 'DESPESA',
        descricao: 'Cinema',
        valor: '40.00',
        dataCompetencia: new Date('2026-08-05'),
      },
    });

    await expect(prisma.categoria.delete({ where: { id: categoria.id } })).rejects.toThrow();
  });

  it('anexo referencia a movimentacao e e excluido em cascata', async () => {
    const usuario = await criarUsuario('anexo@exemplo.com');
    const conta = await criarConta(usuario.id);
    const movimentacao = await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: 'DESPESA',
        descricao: 'Compra com recibo',
        valor: '99.90',
        dataCompetencia: new Date('2026-08-05'),
      },
    });
    await prisma.anexo.create({
      data: {
        movimentacaoId: movimentacao.id,
        usuarioId: usuario.id,
        nomeOriginal: 'recibo.pdf',
        nomeArmazenado: 'abc123.pdf',
        caminho: '/uploads/abc123.pdf',
        tipoMime: 'application/pdf',
        tamanhoBytes: 1024,
      },
    });

    await prisma.movimentacao.delete({ where: { id: movimentacao.id } });

    await expect(prisma.anexo.count({ where: { movimentacaoId: movimentacao.id } })).resolves.toBe(
      0,
    );
  });

  it('compra parcelada vincula suas parcelas via compraParceladaId', async () => {
    const usuario = await criarUsuario('parcelada@exemplo.com');
    const conta = await criarConta(usuario.id);
    const compra = await prisma.compraParcelada.create({
      data: {
        usuarioId: usuario.id,
        descricao: 'Notebook',
        valorTotal: '3000.00',
        totalParcelas: 3,
        dataCompra: new Date('2026-08-05'),
      },
    });

    await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: 'DESPESA',
        descricao: 'Notebook 1/3',
        valor: '1000.00',
        dataCompetencia: new Date('2026-08-05'),
        compraParceladaId: compra.id,
        numeroParcela: 1,
        totalParcelas: 3,
      },
    });

    const compraComParcelas = await prisma.compraParcelada.findUnique({
      where: { id: compra.id },
      include: { parcelas: true },
    });

    expect(compraComParcelas?.parcelas).toHaveLength(1);
  });

  it('movimentacaoEtiqueta vincula etiquetas a movimentacoes e cai em cascata dos dois lados', async () => {
    const usuario = await criarUsuario('vinculo-etiqueta@exemplo.com');
    const conta = await criarConta(usuario.id);
    const etiqueta = await prisma.etiqueta.create({
      data: { usuarioId: usuario.id, nome: 'viagem' },
    });
    const movimentacao = await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: 'DESPESA',
        descricao: 'Passagem aerea',
        valor: '800.00',
        dataCompetencia: new Date('2026-08-05'),
      },
    });

    await prisma.movimentacaoEtiqueta.create({
      data: { movimentacaoId: movimentacao.id, etiquetaId: etiqueta.id },
    });

    await prisma.movimentacao.delete({ where: { id: movimentacao.id } });

    await expect(
      prisma.movimentacaoEtiqueta.count({ where: { etiquetaId: etiqueta.id } }),
    ).resolves.toBe(0);
  });
});
