import { obterMetricas } from '@/observabilidade/metricas';
import { respostaSucesso } from '@/utilitarios/resposta';
import type { Request, Response } from 'express';

export function obter(_req: Request, res: Response): void {
  res.status(200).json(respostaSucesso(obterMetricas(), 'Métricas do processo.'));
}
