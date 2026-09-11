import { access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { ambiente } from '@/configuracao/ambiente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';

const app = criarServidor();

const SENHA_VALIDA = 'SenhaForte@2026';
let contadorEmail = 0;

// E-mail unico por chamada: o limitador de /entrar e 5 por IP+e-mail em
// 15 min, e este arquivo chama isto em quase todo teste — reusar o mesmo
// e-mail esgotaria o limite e derrubaria os testes seguintes com 429.
async function criarUsuarioAutenticado(): Promise<{ usuarioId: string; accessToken: string }> {
  contadorEmail += 1;
  const email = `perfil-${contadorEmail}@exemplo.com`;

  await request(app)
    .post('/api/v1/autenticacao/cadastrar')
    .send({ nome: 'Samuel De Marco', email, senha: SENHA_VALIDA, confirmacaoSenha: SENHA_VALIDA });
  await prisma.usuario.update({
    where: { email },
    data: { emailVerificadoEm: new Date() },
  });
  const login = await request(app)
    .post('/api/v1/autenticacao/entrar')
    .send({ email, senha: SENHA_VALIDA });
  const corpo = login.body as { data: { accessToken: string; usuario: { id: string } } };
  return { usuarioId: corpo.data.usuario.id, accessToken: corpo.data.accessToken };
}

async function gerarPng(): Promise<Buffer> {
  return sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();
}

async function arquivoExiste(caminho: string): Promise<boolean> {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}

describe('GET /api/v1/perfil e PATCH /api/v1/perfil', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('rejeita sem token de acesso (401)', async () => {
    const resposta = await request(app).get('/api/v1/perfil');
    expect(resposta.status).toBe(401);
  });

  it('consulta o perfil com os padroes do cadastro', async () => {
    const { accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .get('/api/v1/perfil')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      success: true,
      data: {
        perfil: {
          nome: 'Samuel De Marco',
          moedaPadrao: 'BRL',
          tema: 'SISTEMA',
          timezone: 'America/Sao_Paulo',
        },
      },
    });
  });

  it('PATCH altera apenas os campos enviados', async () => {
    const { accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .patch('/api/v1/perfil')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ tema: 'ESCURO' });

    expect(resposta.status).toBe(200);
    const corpo = resposta.body as {
      data: { perfil: { tema: string; nome: string; moedaPadrao: string } };
    };
    expect(corpo.data.perfil.tema).toBe('ESCURO');
    expect(corpo.data.perfil.nome).toBe('Samuel De Marco'); // nao mudou
    expect(corpo.data.perfil.moedaPadrao).toBe('BRL'); // nao mudou
  });

  it('PATCH altera nome (Usuario) e preferencias (Perfil) juntos', async () => {
    const { accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .patch('/api/v1/perfil')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Samuel M.', timezone: 'America/New_York' });

    expect(resposta.status).toBe(200);
    const corpo = resposta.body as { data: { perfil: { nome: string; timezone: string } } };
    expect(corpo.data.perfil.nome).toBe('Samuel M.');
    expect(corpo.data.perfil.timezone).toBe('America/New_York');
  });

  it('responde 400 quando o timezone e invalido', async () => {
    const { accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .patch('/api/v1/perfil')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ timezone: 'Nao/Existe' });

    expect(resposta.status).toBe(400);
    expect(resposta.body).toMatchObject({ codigo: 'VALIDACAO' });
  });

  it('responde 400 quando a moeda nao e um codigo ISO 4217 valido', async () => {
    const { accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .patch('/api/v1/perfil')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moedaPadrao: 'XXX_INVALIDO' });

    expect(resposta.status).toBe(400);
  });

  it('responde 400 explicando o motivo quando o corpo tenta alterar o email', async () => {
    const { accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .patch('/api/v1/perfil')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'outro@exemplo.com' });

    expect(resposta.status).toBe(400);
    const corpo = resposta.body as { errors?: { campo: string }[] };
    expect(corpo.errors?.some((e) => e.campo === 'email')).toBe(true);
  });
});

describe('POST /api/v1/perfil/foto e DELETE /api/v1/perfil/foto', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('aceita uma imagem PNG mesmo com extensao .jpg (valida pelo magic number, nao pelo nome)', async () => {
    const { usuarioId, accessToken } = await criarUsuarioAutenticado();
    const png = await gerarPng();

    const resposta = await request(app)
      .post('/api/v1/perfil/foto')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('foto', png, 'foto.jpg');

    expect(resposta.status).toBe(200);
    const corpo = resposta.body as { data: { fotoUrl: string } };
    expect(corpo.data.fotoUrl).toContain(`${usuarioId}.webp`);

    const perfil = await prisma.perfil.findUnique({ where: { usuarioId } });
    expect(perfil?.fotoUrl).toBe(corpo.data.fotoUrl);

    const caminhoFoto = path.join(ambiente.DIRETORIO_UPLOADS, 'avatares', `${usuarioId}.webp`);
    const caminhoThumb = path.join(
      ambiente.DIRETORIO_UPLOADS,
      'avatares',
      `${usuarioId}-thumb.webp`,
    );
    expect(await arquivoExiste(caminhoFoto)).toBe(true);
    expect(await arquivoExiste(caminhoThumb)).toBe(true);
  });

  it('rejeita com 415 um arquivo que nao e imagem, mesmo nomeado como .png', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const conteudoFalso = Buffer.from('MZ' + 'x'.repeat(100)); // cabecalho de executavel, nao imagem

    const resposta = await request(app)
      .post('/api/v1/perfil/foto')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('foto', conteudoFalso, 'foto.png');

    expect(resposta.status).toBe(415);
    expect(resposta.body).toMatchObject({ codigo: 'TIPO_ARQUIVO_INVALIDO' });
  });

  it('rejeita com 413 um arquivo maior que o limite (2 MB)', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const arquivoGrande = Buffer.alloc(3 * 1024 * 1024, 1);

    const resposta = await request(app)
      .post('/api/v1/perfil/foto')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('foto', arquivoGrande, 'grande.png');

    expect(resposta.status).toBe(413);
    expect(resposta.body).toMatchObject({ codigo: 'ARQUIVO_MUITO_GRANDE' });
  });

  it('a nova foto substitui a anterior no mesmo caminho (sem acumulo de orfaos)', async () => {
    const { usuarioId, accessToken } = await criarUsuarioAutenticado();
    const png = await gerarPng();

    await request(app)
      .post('/api/v1/perfil/foto')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('foto', png, 'primeira.png');
    const respostaSegunda = await request(app)
      .post('/api/v1/perfil/foto')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('foto', png, 'segunda.png');

    expect(respostaSegunda.status).toBe(200);
    const caminhoFoto = path.join(ambiente.DIRETORIO_UPLOADS, 'avatares', `${usuarioId}.webp`);
    expect(await arquivoExiste(caminhoFoto)).toBe(true);
  });

  it('DELETE remove a foto do disco e limpa fotoUrl', async () => {
    const { usuarioId, accessToken } = await criarUsuarioAutenticado();
    const png = await gerarPng();
    await request(app)
      .post('/api/v1/perfil/foto')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('foto', png, 'foto.png');

    const resposta = await request(app)
      .delete('/api/v1/perfil/foto')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(204);
    const perfil = await prisma.perfil.findUnique({ where: { usuarioId } });
    expect(perfil?.fotoUrl).toBeNull();

    const caminhoFoto = path.join(ambiente.DIRETORIO_UPLOADS, 'avatares', `${usuarioId}.webp`);
    expect(await arquivoExiste(caminhoFoto)).toBe(false);
  });
});
