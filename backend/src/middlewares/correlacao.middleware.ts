import { randomUUID } from 'node:crypto';
import { contextoRequisicao } from '@/utilitarios/registrador';
import type { NextFunction, Request, Response } from 'express';

const CABECALHO_REQUEST_ID = 'x-request-id';

/** Primeiro middleware da cadeia (02-ARCHITECTURE.md §4.1): sem requestId
 * ainda nao ha nada para logar. Ecoa o `X-Request-Id` do cliente quando
 * presente; gera um novo (UUID v4) caso contrario. O valor fica disponivel
 * tanto em `req.requestId` quanto, via AsyncLocalStorage, para qualquer
 * log emitido durante esta requisicao sem precisar de `req` em maos. */
export function correlacao(req: Request, res: Response, next: NextFunction): void {
  const recebido = req.headers[CABECALHO_REQUEST_ID];
  const requestId = typeof recebido === 'string' && recebido.trim().length > 0 ? recebido : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  contextoRequisicao.run({ requestId }, () => next());
}
