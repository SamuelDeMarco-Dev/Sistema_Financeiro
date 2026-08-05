import { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { limparBanco } from '../configuracao/banco-teste';

async function criarUsuario(email: string): Promise<{ id: string }> {
  return prisma.usuario.create({
    data: { nome: 'Usuaria de Teste', email, senhaHash: 'hash-fake' },
  });
}

describe('banco: Conta, Categoria, Etiqueta', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('saldo_inicial e numeric(14,2) no banco', async () => {
    const [coluna] = await prisma.$queryRaw<
      { data_type: string; numeric_precision: number; numeric_scale: number }[]
    >`
      SELECT data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'contas' AND column_name = 'saldo_inicial'
    `;

    expect(coluna?.data_type).toBe('numeric');
    expect(coluna?.numeric_precision).toBe(14);
    expect(coluna?.numeric_scale).toBe(2);
  });

  it('rejeita duas contas com o mesmo nome (case-insensitive) para o mesmo usuario', async () => {
    const usuario = await criarUsuario('dono-conta@exemplo.com');
    await prisma.conta.create({
      data: { usuarioId: usuario.id, nome: 'Banco Principal', tipo: 'CONTA_CORRENTE' },
    });

    await expect(
      prisma.conta.create({
        data: { usuarioId: usuario.id, nome: 'banco principal', tipo: 'CONTA_CORRENTE' },
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it('conta excluida logicamente libera o nome para reuso', async () => {
    const usuario = await criarUsuario('reuso-nome@exemplo.com');
    const conta = await prisma.conta.create({
      data: { usuarioId: usuario.id, nome: 'Carteira', tipo: 'CARTEIRA' },
    });

    await prisma.conta.update({ where: { id: conta.id }, data: { excluidoEm: new Date() } });

    await expect(
      prisma.conta.create({ data: { usuarioId: usuario.id, nome: 'Carteira', tipo: 'CARTEIRA' } }),
    ).resolves.toMatchObject({ nome: 'Carteira' });
  });

  it('conta sem usuario_id viola o CHECK de escopo', async () => {
    await expect(
      prisma.conta.create({ data: { nome: 'Sem dono', tipo: 'CARTEIRA' } }),
    ).rejects.toThrow(/chk_conta_escopo/);
  });

  it('subcategoria referencia a categoria pai e onDelete Restrict impede excluir pai com filhos', async () => {
    const usuario = await criarUsuario('categorias@exemplo.com');
    const pai = await prisma.categoria.create({
      data: { usuarioId: usuario.id, nome: 'Alimentação', tipo: 'DESPESA' },
    });
    const filha = await prisma.categoria.create({
      data: {
        usuarioId: usuario.id,
        nome: 'Restaurante',
        tipo: 'DESPESA',
        categoriaPaiId: pai.id,
      },
    });

    expect(filha.categoriaPaiId).toBe(pai.id);
    await expect(prisma.categoria.delete({ where: { id: pai.id } })).rejects.toThrow(
      Prisma.PrismaClientKnownRequestError,
    );
  });

  it('categoria padrao do sistema nao tem usuario_id nem conta_compartilhada_id', async () => {
    // Nome distinto das 18 categorias reais do seed (issue #25) — evita
    // colidir com o indice/checagem de duplicidade e, mais importante,
    // nao pode sobreviver ao teste: limparBanco() preserva de proposito
    // as linhas ehPadraoSistema=true (sao fixture compartilhada), entao
    // esta linha de teste precisa se autolimpar.
    const categoria = await prisma.categoria.create({
      data: { nome: 'Categoria Padrao De Teste', tipo: 'RECEITA', ehPadraoSistema: true },
    });

    expect(categoria.usuarioId).toBeNull();

    await prisma.categoria.delete({ where: { id: categoria.id } });
  });

  it('rejeita categoria com usuario_id e eh_padrao_sistema ao mesmo tempo', async () => {
    const usuario = await criarUsuario('padrao-invalida@exemplo.com');

    await expect(
      prisma.categoria.create({
        data: {
          usuarioId: usuario.id,
          nome: 'Invalida',
          tipo: 'DESPESA',
          ehPadraoSistema: true,
        },
      }),
    ).rejects.toThrow(/chk_categoria_escopo/);
  });

  it('rejeita duas etiquetas com o mesmo nome (case-insensitive) para o mesmo usuario', async () => {
    const usuario = await criarUsuario('etiquetas@exemplo.com');
    await prisma.etiqueta.create({ data: { usuarioId: usuario.id, nome: 'viagem' } });

    await expect(
      prisma.etiqueta.create({ data: { usuarioId: usuario.id, nome: 'Viagem' } }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it('exclui contas, categorias e etiquetas em cascata quando o usuario e excluido', async () => {
    const usuario = await criarUsuario('cascata@exemplo.com');
    await prisma.conta.create({
      data: { usuarioId: usuario.id, nome: 'Carteira', tipo: 'CARTEIRA' },
    });
    await prisma.categoria.create({
      data: { usuarioId: usuario.id, nome: 'Lazer', tipo: 'DESPESA' },
    });
    await prisma.etiqueta.create({ data: { usuarioId: usuario.id, nome: 'urgente' } });

    await prisma.usuario.delete({ where: { id: usuario.id } });

    await expect(prisma.conta.count({ where: { usuarioId: usuario.id } })).resolves.toBe(0);
    await expect(prisma.categoria.count({ where: { usuarioId: usuario.id } })).resolves.toBe(0);
    await expect(prisma.etiqueta.count({ where: { usuarioId: usuario.id } })).resolves.toBe(0);
  });
});
