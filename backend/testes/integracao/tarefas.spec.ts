import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { gerarRecorrencias } from '@/tarefas/gerar-recorrencias.tarefa';
import { limparTokens } from '@/tarefas/limpar-tokens.tarefa';
import { marcarAtrasadas } from '@/tarefas/marcar-atrasadas.tarefa';
import { limparBanco } from '../configuracao/banco-teste';
import { prepararUsuarioComConta } from '../fabricas';

function diasA(offsetDias: number): Date {
  const hoje = new Date();
  const base = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  return new Date(base.getTime() + offsetDias * 24 * 60 * 60 * 1000);
}

function mesesA(offsetMeses: number): Date {
  const hoje = new Date();
  return new Date(
    Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + offsetMeses, hoje.getUTCDate()),
  );
}

describe('Tarefas agendadas (issue #41)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  describe('marcarAtrasadas (RF-30)', () => {
    it('so altera PENDENTE com vencimento passado, preservando PAGA, CANCELADA e o modelo de recorrencia; e idempotente', async () => {
      const { usuario, conta, categoria } = await prepararUsuarioComConta();

      const pendenteAtrasada = await prisma.movimentacao.create({
        data: {
          usuarioId: usuario.id,
          contaId: conta.id,
          categoriaId: categoria.id,
          tipo: 'DESPESA',
          descricao: 'Pendente vencida',
          valor: '100.00',
          valorPago: '0.00',
          situacao: 'PENDENTE',
          dataCompetencia: diasA(-10),
          dataVencimento: diasA(-1),
        },
      });
      const pendenteFutura = await prisma.movimentacao.create({
        data: {
          usuarioId: usuario.id,
          contaId: conta.id,
          categoriaId: categoria.id,
          tipo: 'DESPESA',
          descricao: 'Pendente futura',
          valor: '100.00',
          valorPago: '0.00',
          situacao: 'PENDENTE',
          dataCompetencia: diasA(-10),
          dataVencimento: diasA(10),
        },
      });
      const paga = await prisma.movimentacao.create({
        data: {
          usuarioId: usuario.id,
          contaId: conta.id,
          categoriaId: categoria.id,
          tipo: 'DESPESA',
          descricao: 'Paga vencida',
          valor: '100.00',
          valorPago: '100.00',
          situacao: 'PAGA',
          dataCompetencia: diasA(-10),
          dataVencimento: diasA(-1),
          dataEfetivacao: diasA(-5),
        },
      });
      const cancelada = await prisma.movimentacao.create({
        data: {
          usuarioId: usuario.id,
          contaId: conta.id,
          categoriaId: categoria.id,
          tipo: 'DESPESA',
          descricao: 'Cancelada vencida',
          valor: '100.00',
          valorPago: '0.00',
          situacao: 'CANCELADA',
          dataCompetencia: diasA(-10),
          dataVencimento: diasA(-1),
        },
      });
      const modelo = await prisma.movimentacao.create({
        data: {
          usuarioId: usuario.id,
          contaId: conta.id,
          categoriaId: categoria.id,
          tipo: 'DESPESA',
          descricao: 'Modelo de recorrencia',
          valor: '100.00',
          valorPago: '0.00',
          situacao: 'PENDENTE',
          dataCompetencia: diasA(-10),
          dataVencimento: diasA(-1),
          ehModeloRecorrencia: true,
          frequencia: 'MENSAL',
          intervaloRecorrencia: 1,
        },
      });

      const afetados = await marcarAtrasadas();
      expect(afetados).toBe(1);

      const estados = await prisma.movimentacao.findMany({
        where: {
          id: { in: [pendenteAtrasada.id, pendenteFutura.id, paga.id, cancelada.id, modelo.id] },
        },
        select: { id: true, situacao: true },
      });
      const situacaoPorId = new Map(estados.map((m) => [m.id, m.situacao]));
      expect(situacaoPorId.get(pendenteAtrasada.id)).toBe('ATRASADA');
      expect(situacaoPorId.get(pendenteFutura.id)).toBe('PENDENTE');
      expect(situacaoPorId.get(paga.id)).toBe('PAGA');
      expect(situacaoPorId.get(cancelada.id)).toBe('CANCELADA');
      expect(situacaoPorId.get(modelo.id)).toBe('PENDENTE');

      const segundaExecucao = await marcarAtrasadas();
      expect(segundaExecucao).toBe(0);
    });
  });

  describe('gerarRecorrencias (RN-18)', () => {
    it('reabastece a partir da ultima ocorrencia existente, sem duplicar, e e idempotente', async () => {
      const { usuario, conta, categoria } = await prepararUsuarioComConta();
      const ancora = mesesA(0);

      const modelo = await prisma.movimentacao.create({
        data: {
          usuarioId: usuario.id,
          contaId: conta.id,
          categoriaId: categoria.id,
          tipo: 'DESPESA',
          descricao: 'Assinatura',
          valor: '50.00',
          valorPago: '0.00',
          situacao: 'PENDENTE',
          dataCompetencia: ancora,
          dataVencimento: ancora,
          ehModeloRecorrencia: true,
          frequencia: 'MENSAL',
          intervaloRecorrencia: 1,
        },
      });
      await prisma.movimentacao.create({
        data: {
          usuarioId: usuario.id,
          contaId: conta.id,
          categoriaId: categoria.id,
          tipo: 'DESPESA',
          descricao: 'Assinatura',
          valor: '50.00',
          valorPago: '0.00',
          situacao: 'PENDENTE',
          dataCompetencia: ancora,
          dataVencimento: ancora,
          recorrenciaId: modelo.id,
        },
      });

      const geradas = await gerarRecorrencias();
      expect(geradas).toBe(12);

      const totalOcorrencias = await prisma.movimentacao.count({
        where: { recorrenciaId: modelo.id, excluidoEm: null },
      });
      expect(totalOcorrencias).toBe(13);

      const datasUnicas = await prisma.movimentacao.findMany({
        where: { recorrenciaId: modelo.id, excluidoEm: null },
        select: { dataCompetencia: true },
      });
      const datasIso = datasUnicas.map((d) => d.dataCompetencia.toISOString());
      expect(new Set(datasIso).size).toBe(datasIso.length); // nenhuma data duplicada

      const segundaExecucao = await gerarRecorrencias();
      expect(segundaExecucao).toBe(0);
      expect(
        await prisma.movimentacao.count({ where: { recorrenciaId: modelo.id, excluidoEm: null } }),
      ).toBe(13);
    });

    it('respeita recorrenciaTotal, nao gerando alem do limite mesmo com folga na janela de 12 meses', async () => {
      const { usuario, conta, categoria } = await prepararUsuarioComConta();
      const ancora = mesesA(0);

      const modelo = await prisma.movimentacao.create({
        data: {
          usuarioId: usuario.id,
          contaId: conta.id,
          categoriaId: categoria.id,
          tipo: 'DESPESA',
          descricao: 'Parcela',
          valor: '50.00',
          valorPago: '0.00',
          situacao: 'PENDENTE',
          dataCompetencia: ancora,
          dataVencimento: ancora,
          ehModeloRecorrencia: true,
          frequencia: 'MENSAL',
          intervaloRecorrencia: 1,
          recorrenciaTotal: 2,
        },
      });
      await prisma.movimentacao.create({
        data: {
          usuarioId: usuario.id,
          contaId: conta.id,
          categoriaId: categoria.id,
          tipo: 'DESPESA',
          descricao: 'Parcela',
          valor: '50.00',
          valorPago: '0.00',
          situacao: 'PENDENTE',
          dataCompetencia: ancora,
          dataVencimento: ancora,
          recorrenciaId: modelo.id,
        },
      });

      const geradas = await gerarRecorrencias();
      expect(geradas).toBe(1);
      expect(
        await prisma.movimentacao.count({ where: { recorrenciaId: modelo.id, excluidoEm: null } }),
      ).toBe(2);
    });
  });

  describe('limparTokens', () => {
    it('remove apenas tokens expirados e e idempotente', async () => {
      const { usuario } = await prepararUsuarioComConta();

      const expirado = await prisma.tokenRenovacao.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: randomUUID(),
          expiraEm: diasA(-1),
        },
      });
      const valido = await prisma.tokenRenovacao.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: randomUUID(),
          expiraEm: diasA(10),
        },
      });

      const removidos = await limparTokens();
      expect(removidos).toBe(1);

      expect(await prisma.tokenRenovacao.findUnique({ where: { id: expirado.id } })).toBeNull();
      expect(await prisma.tokenRenovacao.findUnique({ where: { id: valido.id } })).not.toBeNull();

      const segundaExecucao = await limparTokens();
      expect(segundaExecucao).toBe(0);
    });

    it('RN-35: marca convites de conta compartilhada vencidos como EXPIRADO, mas nao os ainda validos', async () => {
      const { usuario } = await prepararUsuarioComConta();
      const grupo = await prisma.contaCompartilhada.create({
        data: { nome: 'Grupo de teste', criadoPorId: usuario.id },
      });

      const vencido = await prisma.convite.create({
        data: {
          contaCompartilhadaId: grupo.id,
          email: 'vencido@exemplo.com',
          enviadoPorId: usuario.id,
          token: randomUUID(),
          expiraEm: diasA(-1),
        },
      });
      const valido = await prisma.convite.create({
        data: {
          contaCompartilhadaId: grupo.id,
          email: 'valido@exemplo.com',
          enviadoPorId: usuario.id,
          token: randomUUID(),
          expiraEm: diasA(6),
        },
      });

      await limparTokens();

      expect((await prisma.convite.findUniqueOrThrow({ where: { id: vencido.id } })).situacao).toBe(
        'EXPIRADO',
      );
      expect((await prisma.convite.findUniqueOrThrow({ where: { id: valido.id } })).situacao).toBe(
        'PENDENTE',
      );
    });
  });
});
