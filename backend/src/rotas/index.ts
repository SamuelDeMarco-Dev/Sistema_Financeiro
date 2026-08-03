import { Router } from 'express';
import { autenticacaoRotas } from '@/rotas/autenticacao.rotas';
import { saudeRotas } from '@/rotas/saude.rotas';

// Agregador montado em `/api/v1` (servidor.ts). Cada recurso de dominio
// entra aqui conforme sua issue chega.
export const rotas = Router();

rotas.use(saudeRotas);
rotas.use(autenticacaoRotas);
