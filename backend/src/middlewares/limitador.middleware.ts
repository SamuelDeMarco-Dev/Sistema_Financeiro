import rateLimit from 'express-rate-limit';
import { LimiteExcedidoErro } from '@/erros';
import type { Request, RequestHandler } from 'express';

interface OpcoesLimitador {
  janelaMinutos: number;
  maximo: number;
  /** Chave adicional dentro da janela — ex.: e-mail do corpo, para que o
   * limite valha por IP+e-mail (RN-54), nao so por IP. */
  chaveExtra?: (req: Request) => string;
}

/** Fabrica de limitadores por rota — cada chamador define sua propria
 * janela/maximo (05-DEVELOPMENT.md: RN-54 e' 5/15min no login, issues
 * seguintes usam outros valores para renovar/reenviar-verificacao). */
export function limitador({ janelaMinutos, maximo, chaveExtra }: OpcoesLimitador): RequestHandler {
  return rateLimit({
    windowMs: janelaMinutos * 60_000,
    max: maximo,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => (chaveExtra ? `${req.ip}:${chaveExtra(req)}` : (req.ip ?? '')),
    handler: (_req, res, next) => {
      // Limite superior da janela: express-rate-limit v8 nao expoe o
      // tempo exato restante em `req` sem uma augmentacao propria de tipo.
      res.set('Retry-After', String(janelaMinutos * 60));
      next(new LimiteExcedidoErro('Muitas tentativas. Tente novamente mais tarde.'));
    },
  });
}
