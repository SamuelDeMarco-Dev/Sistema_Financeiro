import { timingSafeEqual } from 'node:crypto';
import { ambiente } from '@/configuracao/ambiente';
import { NaoAutenticadoErro } from '@/erros';
import type { NextFunction, Request, Response } from 'express';

function extrairToken(req: Request): string | undefined {
  const cabecalho = req.get('authorization');
  return cabecalho?.startsWith('Bearer ') ? cabecalho.slice('Bearer '.length) : undefined;
}

function tokensIguais(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  // timingSafeEqual exige buffers do mesmo tamanho — comparar o tamanho
  // primeiro nao vaza mais informacao do que a resposta 401 ja vazaria.
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

/** Protege `/metricas` (issue #64) por token de administração fixo em
 * variável de ambiente — não por sessão de usuário, que não existe aqui.
 * Sem `TOKEN_METRICAS` configurado (dev/test), a rota fica sempre
 * inacessível em vez de aberta por omissão. */
export function autenticarMetricas(req: Request, _res: Response, next: NextFunction): void {
  const token = extrairToken(req);
  const tokenEsperado = ambiente.TOKEN_METRICAS;

  if (!token || !tokenEsperado || !tokensIguais(token, tokenEsperado)) {
    throw new NaoAutenticadoErro('Token de métricas ausente ou inválido.');
  }

  next();
}
