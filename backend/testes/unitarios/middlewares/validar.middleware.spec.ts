import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validar } from '@/middlewares/validar.middleware';
import type { Request, Response } from 'express';

const schema = z.object({
  body: z.object({ nome: z.string().min(3) }),
});

describe('validar', () => {
  it('substitui req.body pelo resultado analisado e chama next()', () => {
    const req = { body: { nome: 'Ana' }, params: {}, query: {} } as unknown as Request;
    const next = vi.fn();

    validar(schema)(req, {} as Response, next);

    expect(req.body).toEqual({ nome: 'Ana' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('propaga ZodError quando a entrada e invalida, sem chamar next()', () => {
    const req = { body: { nome: 'AB' }, params: {}, query: {} } as unknown as Request;
    const next = vi.fn();

    expect(() => {
      validar(schema)(req, {} as Response, next);
    }).toThrow();
    expect(next).not.toHaveBeenCalled();
  });
});
