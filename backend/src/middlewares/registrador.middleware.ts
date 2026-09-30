import { registrarRequisicao } from '@/observabilidade/metricas';
import { registrador } from '@/utilitarios/registrador';
import type { NextFunction, Request, Response } from 'express';

const NANOSSEGUNDOS_POR_MILISSEGUNDO = 1_000_000;

/** Um registro por requisicao, emitido em `finish` (quando a resposta ja
 * foi totalmente enviada) para que `status` e `duracaoMs` reflitam o
 * resultado real. Deliberadamente nao inclui `req.body`: nenhuma rota,
 * inclusive as de autenticacao, tem seu corpo exposto no log por
 * construcao — nao por uma lista de exclusao que alguem pode esquecer de
 * atualizar. */
export function registradorRequisicoes(req: Request, res: Response, next: NextFunction): void {
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const duracaoMs = Number(process.hrtime.bigint() - inicio) / NANOSSEGUNDOS_POR_MILISSEGUNDO;

    registrarRequisicao(duracaoMs, res.statusCode);

    registrador.info(
      {
        metodo: req.method,
        rota: req.originalUrl,
        status: res.statusCode,
        duracaoMs: Math.round(duracaoMs * 100) / 100,
      },
      'Requisicao processada',
    );
  });

  next();
}
