import { Router } from 'express';
import { liveness, prontidao } from '@/controladores/saude.controlador';

export const saudeRotas = Router();

saudeRotas.get('/saude', liveness);
saudeRotas.get('/saude/prontidao', prontidao);
