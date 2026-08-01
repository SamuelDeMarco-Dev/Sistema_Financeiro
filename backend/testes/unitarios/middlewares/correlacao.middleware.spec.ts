import { describe, expect, it, vi } from 'vitest';
import { correlacao } from '@/middlewares/correlacao.middleware';
import { contextoRequisicao } from '@/utilitarios/registrador';
import type { Request, Response } from 'express';

function fabricarRequisicao(cabecalhos: Record<string, string> = {}): Request {
  return { headers: cabecalhos } as unknown as Request;
}

function fabricarResposta(): Response {
  const res = {} as Response;
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
}

describe('correlacao', () => {
  it('ecoa o X-Request-Id recebido do cliente', () => {
    const req = fabricarRequisicao({ 'x-request-id': 'id-do-cliente' });
    const res = fabricarResposta();
    const next = vi.fn();

    correlacao(req, res, next);

    expect(req.requestId).toBe('id-do-cliente');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'id-do-cliente');
    expect(next).toHaveBeenCalledOnce();
  });

  it('gera um novo requestId (UUID) quando o cliente nao envia X-Request-Id', () => {
    const req = fabricarRequisicao();
    const res = fabricarResposta();
    const next = vi.fn();

    correlacao(req, res, next);

    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
  });

  it('disponibiliza o requestId via AsyncLocalStorage durante o restante da cadeia', () => {
    const req = fabricarRequisicao({ 'x-request-id': 'id-ctx' });
    const res = fabricarResposta();
    let capturado: string | undefined;

    correlacao(req, res, () => {
      capturado = contextoRequisicao.getStore()?.requestId;
    });

    expect(capturado).toBe('id-ctx');
  });
});
