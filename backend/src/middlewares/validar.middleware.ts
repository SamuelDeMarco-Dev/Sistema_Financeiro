import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

interface EntradaValidada {
  body?: unknown;
  params?: unknown;
  query?: unknown;
}

/** Valida `{ body, params, query }` contra o schema e substitui cada parte
 * pelo resultado — inclusive coercoes e valores padrao do schema chegam ao
 * handler. ZodError propagada e traduzida pelo tratadorErros (400 VALIDACAO). */
export function validar(schema: ZodType<EntradaValidada>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const analisado = schema.parse({
      body: req.body as unknown,
      params: req.params as unknown,
      query: req.query as unknown,
    });

    if (analisado.body !== undefined) req.body = analisado.body;
    if (analisado.params !== undefined) req.params = analisado.params as typeof req.params;
    if (analisado.query !== undefined) req.query = analisado.query as typeof req.query;

    next();
  };
}
