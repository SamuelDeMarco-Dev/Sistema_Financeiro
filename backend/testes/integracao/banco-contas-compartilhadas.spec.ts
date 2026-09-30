import { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { limparBanco } from '../configuracao/banco-teste';

async function criarUsuario(email: string): Promise<{ id: string }> {
  return prisma.usuario.create({
    data: { nome: 'Usuaria de Teste', email, senhaHash: 'hash-fake' },
  });
}

async function criarGrupo(criadoPorId: string): Promise<{ id: string }> {
  return prisma.contaCompartilhada.create({
    data: { nome: 'Familia', criadoPorId },
  });
}

describe('banco: constraints de dominio de contas compartilhadas (issue #66)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('RN-28: inserir um segundo ADMINISTRADOR ativo no mesmo grupo viola uq_grupo_um_administrador', async () => {
    const criador = await criarUsuario('criador-rn28@exemplo.com');
    const outro = await criarUsuario('outro-rn28@exemplo.com');
    const grupo = await criarGrupo(criador.id);

    await prisma.membroCompartilhado.create({
      data: { contaCompartilhadaId: grupo.id, usuarioId: criador.id, papel: 'ADMINISTRADOR' },
    });

    await expect(
      prisma.membroCompartilhado.create({
        data: { contaCompartilhadaId: grupo.id, usuarioId: outro.id, papel: 'ADMINISTRADOR' },
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it('RN-28: um ADMINISTRADOR removido nao bloqueia um novo ADMINISTRADOR ativo', async () => {
    const criador = await criarUsuario('criador-rn28b@exemplo.com');
    const outro = await criarUsuario('outro-rn28b@exemplo.com');
    const grupo = await criarGrupo(criador.id);

    const membroAntigo = await prisma.membroCompartilhado.create({
      data: { contaCompartilhadaId: grupo.id, usuarioId: criador.id, papel: 'ADMINISTRADOR' },
    });
    await prisma.membroCompartilhado.update({
      where: { id: membroAntigo.id },
      data: { situacao: 'SAIU', papel: 'PARTICIPANTE' },
    });

    await expect(
      prisma.membroCompartilhado.create({
        data: { contaCompartilhadaId: grupo.id, usuarioId: outro.id, papel: 'ADMINISTRADOR' },
      }),
    ).resolves.toMatchObject({ papel: 'ADMINISTRADOR' });
  });

  it('RN-36: um segundo convite PENDENTE para o mesmo e-mail e grupo viola uq_convite_pendente', async () => {
    const admin = await criarUsuario('admin-rn36@exemplo.com');
    const grupo = await criarGrupo(admin.id);
    const dadosConvite = {
      contaCompartilhadaId: grupo.id,
      email: 'convidado@exemplo.com',
      enviadoPorId: admin.id,
      expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    await prisma.convite.create({ data: { ...dadosConvite, token: 'token-um' } });

    await expect(
      prisma.convite.create({ data: { ...dadosConvite, token: 'token-dois' } }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it('RN-36: um convite CANCELADO nao bloqueia um novo convite PENDENTE para o mesmo e-mail', async () => {
    const admin = await criarUsuario('admin-rn36b@exemplo.com');
    const grupo = await criarGrupo(admin.id);
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const primeiro = await prisma.convite.create({
      data: {
        contaCompartilhadaId: grupo.id,
        email: 'convidado-b@exemplo.com',
        enviadoPorId: admin.id,
        expiraEm,
        token: 'token-cancelado',
      },
    });
    await prisma.convite.update({ where: { id: primeiro.id }, data: { situacao: 'CANCELADO' } });

    await expect(
      prisma.convite.create({
        data: {
          contaCompartilhadaId: grupo.id,
          email: 'convidado-b@exemplo.com',
          enviadoPorId: admin.id,
          expiraEm,
          token: 'token-novo',
        },
      }),
    ).resolves.toMatchObject({ situacao: 'PENDENTE' });
  });

  it('RN-09: movimentacao de grupo (sem conta_id) satisfaz chk_mov_escopo', async () => {
    const admin = await criarUsuario('admin-mov-grupo@exemplo.com');
    const grupo = await criarGrupo(admin.id);

    await expect(
      prisma.movimentacao.create({
        data: {
          usuarioId: admin.id,
          contaCompartilhadaId: grupo.id,
          tipo: 'DESPESA',
          descricao: 'Despesa do grupo',
          valor: '50.00',
          dataCompetencia: new Date('2026-08-05'),
        },
      }),
    ).resolves.toMatchObject({ contaCompartilhadaId: grupo.id, contaId: null });
  });

  it('chk_mov_escopo: movimentacao com conta_id E conta_compartilhada_id ao mesmo tempo e rejeitada', async () => {
    const admin = await criarUsuario('admin-duplo-escopo@exemplo.com');
    const grupo = await criarGrupo(admin.id);
    const conta = await prisma.conta.create({
      data: { usuarioId: admin.id, nome: 'Carteira', tipo: 'CARTEIRA' },
    });

    await expect(
      prisma.movimentacao.create({
        data: {
          usuarioId: admin.id,
          contaId: conta.id,
          contaCompartilhadaId: grupo.id,
          tipo: 'DESPESA',
          descricao: 'Duplo escopo',
          valor: '10.00',
          dataCompetencia: new Date('2026-08-05'),
        },
      }),
    ).rejects.toThrow(/chk_mov_escopo/);
  });

  it('chk_conta_escopo: conta de grupo (sem usuario_id) e aceita', async () => {
    const admin = await criarUsuario('admin-conta-grupo@exemplo.com');
    const grupo = await criarGrupo(admin.id);

    await expect(
      prisma.conta.create({
        data: { contaCompartilhadaId: grupo.id, nome: 'Conta do grupo', tipo: 'CONTA_CORRENTE' },
      }),
    ).resolves.toMatchObject({ usuarioId: null, contaCompartilhadaId: grupo.id });
  });

  it('chk_conta_escopo: conta sem usuario_id nem conta_compartilhada_id e rejeitada', async () => {
    await expect(
      prisma.conta.create({ data: { nome: 'Conta orfa', tipo: 'CONTA_CORRENTE' } }),
    ).rejects.toThrow(/chk_conta_escopo/);
  });

  it('chk_categoria_escopo: categoria de grupo e aceita', async () => {
    const admin = await criarUsuario('admin-categoria-grupo@exemplo.com');
    const grupo = await criarGrupo(admin.id);

    await expect(
      prisma.categoria.create({
        data: { contaCompartilhadaId: grupo.id, nome: 'Categoria do grupo', tipo: 'DESPESA' },
      }),
    ).resolves.toMatchObject({ contaCompartilhadaId: grupo.id });
  });

  it('chk_etiqueta_escopo: etiqueta de grupo e aceita', async () => {
    const admin = await criarUsuario('admin-etiqueta-grupo@exemplo.com');
    const grupo = await criarGrupo(admin.id);

    await expect(
      prisma.etiqueta.create({
        data: { contaCompartilhadaId: grupo.id, nome: 'Urgente' },
      }),
    ).resolves.toMatchObject({ contaCompartilhadaId: grupo.id });
  });

  it('uq_conta_nome_grupo: nome de conta duplicado no mesmo grupo e rejeitado', async () => {
    const admin = await criarUsuario('admin-uq-conta-grupo@exemplo.com');
    const grupo = await criarGrupo(admin.id);
    await prisma.conta.create({
      data: { contaCompartilhadaId: grupo.id, nome: 'Conta Comum', tipo: 'CONTA_CORRENTE' },
    });

    await expect(
      prisma.conta.create({
        data: { contaCompartilhadaId: grupo.id, nome: 'conta comum', tipo: 'CARTEIRA' },
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it('uq_categoria_nome_grupo: nome de categoria duplicado no mesmo grupo e rejeitado', async () => {
    const admin = await criarUsuario('admin-uq-categoria-grupo@exemplo.com');
    const grupo = await criarGrupo(admin.id);
    await prisma.categoria.create({
      data: { contaCompartilhadaId: grupo.id, nome: 'Lazer', tipo: 'DESPESA' },
    });

    await expect(
      prisma.categoria.create({
        data: { contaCompartilhadaId: grupo.id, nome: 'lazer', tipo: 'DESPESA' },
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it('movimentacoes pessoais existentes continuam integras apos a migration (regressao M2/M3)', async () => {
    const usuario = await criarUsuario('regressao-pessoal@exemplo.com');
    const conta = await prisma.conta.create({
      data: { usuarioId: usuario.id, nome: 'Carteira', tipo: 'CARTEIRA' },
    });

    const movimentacao = await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: 'DESPESA',
        descricao: 'Movimentacao pessoal preexistente',
        valor: '25.00',
        dataCompetencia: new Date('2026-08-05'),
      },
    });

    const encontrada = await prisma.movimentacao.findUniqueOrThrow({
      where: { id: movimentacao.id },
    });
    expect(encontrada.contaId).toBe(conta.id);
    expect(encontrada.contaCompartilhadaId).toBeNull();
  });
});
