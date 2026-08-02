import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { NaoEncontradoErro, RegraNegocioErro } from '@/erros';
import { tratadorErros } from '@/middlewares/tratador-erros.middleware';
import type { Request, Response } from 'express';

function fabricarResposta(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function fabricarRequisicao(): Request {
  return { method: 'GET', originalUrl: '/teste' } as Request;
}

function corpoEnviado(res: Response): Record<string, unknown> {
  return (res.json as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
}

describe('tratadorErros', () => {
  it('traduz ZodError para 400 VALIDACAO com um detalhe por campo (sem o prefixo "body")', () => {
    const schema = z.object({ valor: z.string(), descricao: z.string().min(2) });
    const resultado = schema.safeParse({ valor: 123, descricao: 'x' });
    const res = fabricarResposta();

    tratadorErros(resultado.error, fabricarRequisicao(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    const corpo = corpoEnviado(res);
    expect(corpo).toMatchObject({ success: false, codigo: 'VALIDACAO' });
    expect(corpo.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'valor' })]),
    );
  });

  it('traduz ErroAplicacao (NaoEncontradoErro) para 404 com o codigo e a mensagem da classe', () => {
    const res = fabricarResposta();

    tratadorErros(
      new NaoEncontradoErro('Conta nao encontrada.'),
      fabricarRequisicao(),
      res,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(corpoEnviado(res)).toMatchObject({
      success: false,
      codigo: 'NAO_ENCONTRADO',
      message: 'Conta nao encontrada.',
    });
  });

  it('traduz ErroAplicacao (RegraNegocioErro) para 422', () => {
    const res = fabricarResposta();

    tratadorErros(new RegraNegocioErro('Conta arquivada.'), fabricarRequisicao(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(corpoEnviado(res)).toMatchObject({ codigo: 'REGRA_NEGOCIO' });
  });

  it('traduz erro Prisma P2002 para 409 CONFLITO', () => {
    const res = fabricarResposta();
    const erroPrisma = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3',
    });

    tratadorErros(erroPrisma, fabricarRequisicao(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(corpoEnviado(res)).toMatchObject({ codigo: 'CONFLITO' });
  });

  it('traduz erro Prisma P2025 para 404 NAO_ENCONTRADO', () => {
    const res = fabricarResposta();
    const erroPrisma = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '6.19.3',
    });

    tratadorErros(erroPrisma, fabricarRequisicao(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(corpoEnviado(res)).toMatchObject({ codigo: 'NAO_ENCONTRADO' });
  });

  it('traduz erro Prisma desconhecido para 500 ERRO_INTERNO', () => {
    const res = fabricarResposta();
    const erroPrisma = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: '6.19.3',
    });

    tratadorErros(erroPrisma, fabricarRequisicao(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(corpoEnviado(res)).toMatchObject({ codigo: 'ERRO_INTERNO' });
  });

  it('traduz erro desconhecido (nao tipado) para 500 ERRO_INTERNO, sem stack no corpo (RN-56)', () => {
    const res = fabricarResposta();

    tratadorErros(new Error('detalhe interno sensivel'), fabricarRequisicao(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const corpo = corpoEnviado(res);
    expect(corpo).toMatchObject({ success: false, codigo: 'ERRO_INTERNO' });
    expect(JSON.stringify(corpo)).not.toContain('detalhe interno sensivel');
    expect(corpo.errors).toBeUndefined();
  });
});
