import { NaoEncontradoErro } from '@/erros';
import type { NextFunction, Request, Response } from 'express';

/** Ultimo middleware antes do tratadorErros: nenhuma rota casou. */
export function naoEncontrado(req: Request, _res: Response, next: NextFunction): void {
  next(new NaoEncontradoErro(`Rota ${req.method} ${req.originalUrl} nao existe.`));
}
