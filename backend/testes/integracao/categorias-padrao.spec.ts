import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { seedCategoriasPadrao } from '../../prisma/seed-categorias';
import { garantirCategoriasPadrao, limparBanco } from '../configuracao/banco-teste';

const app = criarServidor();
const SENHA_VALIDA = 'SenhaForte@2026';

describe('categorias padrao do sistema (RF-19)', () => {
  beforeAll(async () => {
    await garantirCategoriasPadrao();
  });

  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('seedCategoriasPadrao cria as 18 categorias raiz com eh_padrao_sistema=true', async () => {
    const raizes = await prisma.categoria.findMany({
      where: { ehPadraoSistema: true, categoriaPaiId: null },
    });

    expect(raizes).toHaveLength(18);
  });

  it('seedCategoriasPadrao cria as subcategorias de Alimentação, Transporte e Moradia', async () => {
    const alimentacao = await prisma.categoria.findFirst({
      where: { ehPadraoSistema: true, nome: 'Alimentação', categoriaPaiId: null },
      include: { subcategorias: true },
    });
    const transporte = await prisma.categoria.findFirst({
      where: { ehPadraoSistema: true, nome: 'Transporte', categoriaPaiId: null },
      include: { subcategorias: true },
    });
    const moradia = await prisma.categoria.findFirst({
      where: { ehPadraoSistema: true, nome: 'Moradia', categoriaPaiId: null },
      include: { subcategorias: true },
    });

    expect(alimentacao?.subcategorias.map((s) => s.nome).sort()).toEqual(
      ['Delivery', 'Lanche', 'Restaurante'].sort(),
    );
    expect(transporte?.subcategorias).toHaveLength(4);
    expect(moradia?.subcategorias).toHaveLength(5);
  });

  it('rodar o seed duas vezes nao duplica categorias', async () => {
    await seedCategoriasPadrao(prisma);
    await seedCategoriasPadrao(prisma);

    const raizes = await prisma.categoria.findMany({
      where: { ehPadraoSistema: true, categoriaPaiId: null },
    });
    expect(raizes).toHaveLength(18);

    const alimentacao = await prisma.categoria.findFirst({
      where: { ehPadraoSistema: true, nome: 'Alimentação', categoriaPaiId: null },
      include: { subcategorias: true },
    });
    expect(alimentacao?.subcategorias).toHaveLength(3);
  });

  it('usuario recem-cadastrado recebe as 18 categorias com a hierarquia correta', async () => {
    const email = 'copia-categorias@exemplo.com';
    await request(app).post('/api/v1/autenticacao/cadastrar').send({
      nome: 'Samuel De Marco',
      email,
      senha: SENHA_VALIDA,
      confirmacaoSenha: SENHA_VALIDA,
    });

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    const categorias = await prisma.categoria.findMany({
      where: { usuarioId: usuario.id },
      include: { subcategorias: true },
    });
    const raizes = categorias.filter((c) => c.categoriaPaiId === null);
    const alimentacao = raizes.find((c) => c.nome === 'Alimentação');

    expect(raizes).toHaveLength(18);
    expect(raizes.every((c) => !c.ehPadraoSistema)).toBe(true);
    expect(alimentacao?.subcategorias.map((s) => s.nome).sort()).toEqual(
      ['Delivery', 'Lanche', 'Restaurante'].sort(),
    );
    expect(alimentacao?.subcategorias.every((s) => s.categoriaPaiId === alimentacao.id)).toBe(true);
  });
});
