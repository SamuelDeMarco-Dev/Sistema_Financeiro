import { Router } from 'express';
import { obter } from '@/controladores/metricas.controlador';
import { autenticarMetricas } from '@/middlewares/autenticar-metricas.middleware';

// Fora de `/api/v1` de proposito (como `/uploads`): nao e um recurso de
// dominio, e um endpoint operacional consultado por ferramentas, nao pelo
// frontend (issue #64; formato Prometheus fica para a issue #125).
export const metricasRotas = Router();

metricasRotas.get('/metricas', autenticarMetricas, obter);
