import { Router } from 'express';
import { saudeRotas } from '@/rotas/saude.rotas';

// Agregador montado em `/api/v1` (servidor.ts). Cada recurso de dominio
// entra aqui conforme sua issue chega — `saude` e o unico ate agora.
export const rotas = Router();

rotas.use(saudeRotas);
