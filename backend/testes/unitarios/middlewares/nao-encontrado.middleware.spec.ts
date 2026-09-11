import { describe, expect, it, vi } from 'vitest';
import { NaoEncontradoErro } from '@/erros';
import { naoEncontrado } from '@/middlewares/nao-encontrado.middleware';
import type { Request, Response } from 'express';

describe('naoEncontrado', () => {
  it('chama next com NaoEncontradoErro descrevendo metodo e rota', () => {
    const req = { method: 'GET', originalUrl: '/rota/inexistente' } as Request;
    const next = vi.fn();

    naoEncontrado(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    const [erro] = next.mock.calls[0] as [NaoEncontradoErro];
    expect(erro).toBeInstanceOf(NaoEncontradoErro);
    expect(erro.message).toBe('Rota GET /rota/inexistente nao existe.');
  });
});
