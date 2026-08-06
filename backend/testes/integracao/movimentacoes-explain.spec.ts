import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarConta, fabricarUsuario } from '../fabricas';

interface LinhaPlano {
  'QUERY PLAN': string;
}

// RNF-13/issue #45: "nenhum Seq Scan em movimentacoes". Isso so e uma
// pergunta com resposta estavel em uma tabela de tamanho realista — em
// poucas linhas o planner do Postgres prefere Seq Scan de propósito (é
// mais rápido mesmo), então o teste povoa a tabela antes de perguntar.
describe('EXPLAIN ANALYZE: listagem com filtros combinados', () => {
  let usuarioId: string;
  let contaId: string;

  beforeAll(async () => {
    await limparBanco();
    const { usuario } = await fabricarUsuario({ email: 'explain@exemplo.com' });
    const conta = await fabricarConta(usuario.id);
    usuarioId = usuario.id;
    contaId = conta.id;

    const TOTAL_LINHAS = 3000;
    const TIPOS = ['RECEITA', 'DESPESA'] as const;
    const SITUACOES = ['PENDENTE', 'PAGA', 'PAGA_PARCIALMENTE', 'ATRASADA'] as const;

    function situacaoNoIndice(indice: number): (typeof SITUACOES)[number] {
      return SITUACOES[indice % SITUACOES.length] ?? 'PENDENTE';
    }
    function tipoNoIndice(indice: number): (typeof TIPOS)[number] {
      return TIPOS[indice % TIPOS.length] ?? 'DESPESA';
    }

    const linhas = Array.from({ length: TOTAL_LINHAS }, (_, indice) => {
      const dia = (indice % 27) + 1;
      const mes = (indice % 12) + 1;
      const ano = 2024 + (indice % 3);
      const dataCompetencia = new Date(Date.UTC(ano, mes - 1, dia));
      const situacao = situacaoNoIndice(indice);
      const efetivada = situacao === 'PAGA' || situacao === 'PAGA_PARCIALMENTE';
      const valorPago =
        situacao === 'PAGA' ? '100.00' : situacao === 'PAGA_PARCIALMENTE' ? '50.00' : '0.00';
      return {
        usuarioId,
        contaId,
        tipo: tipoNoIndice(indice),
        descricao: `Movimentação de carga ${indice}`,
        valor: '100.00',
        valorPago,
        situacao,
        dataCompetencia,
        dataEfetivacao: efetivada ? dataCompetencia : null,
      };
    });
    await prisma.movimentacao.createMany({ data: linhas });
  }, 30_000);

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('nao usa Seq Scan em movimentacoes para usuarioId + periodo + tipo + situacao + contaId', async () => {
    const plano = await prisma.$queryRaw<LinhaPlano[]>`
      EXPLAIN ANALYZE
      SELECT *
      FROM movimentacoes
      WHERE usuario_id = ${usuarioId}
        AND conta_id = ${contaId}
        AND excluido_em IS NULL
        AND eh_modelo_recorrencia = false
        AND tipo IN ('RECEITA', 'DESPESA')
        AND situacao IN ('PENDENTE', 'PAGA', 'PAGA_PARCIALMENTE')
        AND data_competencia BETWEEN '2025-01-01' AND '2025-12-31'
      ORDER BY data_competencia DESC
      LIMIT 20
    `;

    const texto = plano.map((linha) => linha['QUERY PLAN']).join('\n');
    expect(texto).not.toMatch(/Seq Scan on movimentacoes/i);
  });
});
