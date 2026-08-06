import { access } from 'node:fs/promises';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface RespostaAnexos {
  data: {
    anexos: {
      id: string;
      nomeOriginal: string;
      tipoMime: string;
      tamanhoBytes: number;
      url: string;
    }[];
  };
}
interface RespostaErro {
  codigo: string;
}
interface RespostaMovimentacao {
  data: { movimentacao: { id: string } };
}

function exigir<T>(valor: T | null | undefined, mensagem: string): T {
  if (valor === null || valor === undefined) {
    throw new Error(mensagem);
  }
  return valor;
}

async function arquivoExiste(caminho: string): Promise<boolean> {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}

function bufferPdf(): Buffer {
  return Buffer.from(`%PDF-1.4\n${'0'.repeat(64)}`);
}

// file-type exige uma estrutura PNG de verdade (nao so a assinatura de 8
// bytes) para reconhecer o formato — gerar via sharp em vez de montar os
// bytes a mao.
async function bufferPng(): Promise<Buffer> {
  return sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();
}

function bufferExecutavel(): Buffer {
  // Cabecalho MZ de executavel Windows — nunca deveria passar como PDF/imagem.
  return Buffer.concat([Buffer.from([0x4d, 0x5a, 0x90, 0x00]), Buffer.alloc(64, 0)]);
}

async function criarMovimentacao(
  accessToken: string,
  contaId: string,
  categoriaId: string,
): Promise<string> {
  const resposta = await request(app)
    .post('/api/v1/movimentacoes')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      tipo: 'DESPESA',
      descricao: 'Compra com comprovante',
      valor: '100.00',
      dataCompetencia: '2026-08-05',
      contaId,
      categoriaId,
    });
  return (resposta.body as RespostaMovimentacao).data.movimentacao.id;
}

describe('Anexos (issue #40)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('upload de PDF e de PNG funciona e retorna os metadados do anexo', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacaoId = await criarMovimentacao(accessToken, conta.id, categoria.id);

    const resposta = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacaoId}/anexos`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('arquivo', bufferPdf(), 'comprovante.pdf')
      .attach('arquivo', await bufferPng(), 'foto.png');

    expect(resposta.status).toBe(201);
    const anexos = (resposta.body as RespostaAnexos).data.anexos;
    expect(anexos).toHaveLength(2);
    expect(anexos.map((a) => a.tipoMime).sort()).toEqual(['application/pdf', 'image/png']);
    expect(anexos[0]?.url).toMatch(/^\/api\/v1\/anexos\/.+\/conteudo$/);

    const contagem = await prisma.anexo.count({ where: { movimentacaoId } });
    expect(contagem).toBe(2);
  });

  it('.exe renomeado para .pdf e rejeitado com 415 (magic number, nao extensao)', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacaoId = await criarMovimentacao(accessToken, conta.id, categoria.id);

    const resposta = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacaoId}/anexos`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('arquivo', bufferExecutavel(), 'documento.pdf');

    expect(resposta.status).toBe(415);
    expect((resposta.body as RespostaErro).codigo).toBe('TIPO_ARQUIVO_INVALIDO');
  });

  it('arquivo acima de 5MB responde 413', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacaoId = await criarMovimentacao(accessToken, conta.id, categoria.id);
    const arquivoGrande = Buffer.concat([bufferPdf(), Buffer.alloc(6 * 1024 * 1024, 1)]);

    const resposta = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacaoId}/anexos`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('arquivo', arquivoGrande, 'grande.pdf');

    expect(resposta.status).toBe(413);
    expect((resposta.body as RespostaErro).codigo).toBe('ARQUIVO_MUITO_GRANDE');
  });

  it('o 6o anexo na mesma movimentacao responde 422', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacaoId = await criarMovimentacao(accessToken, conta.id, categoria.id);

    for (let i = 0; i < 5; i += 1) {
      const resposta = await request(app)
        .post(`/api/v1/movimentacoes/${movimentacaoId}/anexos`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('arquivo', bufferPdf(), `comprovante-${i}.pdf`);
      expect(resposta.status).toBe(201);
    }

    const sexto = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacaoId}/anexos`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('arquivo', bufferPdf(), 'comprovante-6.pdf');

    expect(sexto.status).toBe(422);
    expect((sexto.body as RespostaErro).codigo).toBe('REGRA_NEGOCIO');
  });

  it('anexo de outro usuario responde 404 no download e na exclusao', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacaoId = await criarMovimentacao(accessToken, conta.id, categoria.id);
    const upload = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacaoId}/anexos`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('arquivo', bufferPdf(), 'comprovante.pdf');
    const anexoId = exigir((upload.body as RespostaAnexos).data.anexos[0]?.id, 'anexoId ausente');

    const { accessToken: tokenDeOutro } = await prepararUsuarioComConta();

    const download = await request(app)
      .get(`/api/v1/anexos/${anexoId}/conteudo`)
      .set('Authorization', `Bearer ${tokenDeOutro}`);
    const exclusao = await request(app)
      .delete(`/api/v1/anexos/${anexoId}`)
      .set('Authorization', `Bearer ${tokenDeOutro}`);

    expect(download.status).toBe(404);
    expect(exclusao.status).toBe(404);
  });

  it('download retorna o conteudo com Content-Disposition inline e o nome original', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacaoId = await criarMovimentacao(accessToken, conta.id, categoria.id);
    const upload = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacaoId}/anexos`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('arquivo', bufferPdf(), 'comprovante.pdf');
    const anexoId = exigir((upload.body as RespostaAnexos).data.anexos[0]?.id, 'anexoId ausente');

    const download = await request(app)
      .get(`/api/v1/anexos/${anexoId}/conteudo`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('application/pdf');
    expect(download.headers['content-disposition']).toContain('inline');
    expect(download.headers['content-disposition']).toContain('comprovante.pdf');
  });

  it('excluir anexo remove o registro e o arquivo do disco', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacaoId = await criarMovimentacao(accessToken, conta.id, categoria.id);
    const upload = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacaoId}/anexos`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('arquivo', bufferPdf(), 'comprovante.pdf');
    const anexoId = exigir((upload.body as RespostaAnexos).data.anexos[0]?.id, 'anexoId ausente');
    const registro = await prisma.anexo.findUniqueOrThrow({ where: { id: anexoId } });
    expect(await arquivoExiste(registro.caminho)).toBe(true);

    const exclusao = await request(app)
      .delete(`/api/v1/anexos/${anexoId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(exclusao.status).toBe(204);
    expect(await prisma.anexo.findUnique({ where: { id: anexoId } })).toBeNull();
    expect(await arquivoExiste(registro.caminho)).toBe(false);
  });

  it('excluir a movimentacao remove os anexos dela do disco e do banco', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacaoId = await criarMovimentacao(accessToken, conta.id, categoria.id);
    const upload = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacaoId}/anexos`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('arquivo', bufferPdf(), 'comprovante.pdf');
    const anexoId = exigir((upload.body as RespostaAnexos).data.anexos[0]?.id, 'anexoId ausente');
    const registro = await prisma.anexo.findUniqueOrThrow({ where: { id: anexoId } });

    const exclusao = await request(app)
      .delete(`/api/v1/movimentacoes/${movimentacaoId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(exclusao.status).toBe(204);

    expect(await prisma.anexo.findUnique({ where: { id: anexoId } })).toBeNull();
    expect(await arquivoExiste(registro.caminho)).toBe(false);
  });

  it('nome original com caracteres de escape e sanitizado, sem afetar o caminho gravado', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacaoId = await criarMovimentacao(accessToken, conta.id, categoria.id);

    const resposta = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacaoId}/anexos`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('arquivo', bufferPdf(), '../../etc/malicioso.pdf');

    expect(resposta.status).toBe(201);
    const anexo = exigir(
      (resposta.body as RespostaAnexos).data.anexos[0],
      'anexo ausente na resposta',
    );
    expect(anexo.nomeOriginal).not.toContain('/');
    expect(anexo.nomeOriginal).not.toContain('..');

    const registro = await prisma.anexo.findUniqueOrThrow({ where: { id: anexo.id } });
    expect(registro.nomeArmazenado).not.toContain('/');
    expect(registro.nomeArmazenado).not.toContain('..');
    expect(await arquivoExiste(registro.caminho)).toBe(true);
  });
});
