import { Router } from 'express';
import { autenticacaoRotas } from '@/rotas/autenticacao.rotas';
import { categoriasRotas } from '@/rotas/categorias.rotas';
import { contasRotas } from '@/rotas/contas.rotas';
import { etiquetasRotas } from '@/rotas/etiquetas.rotas';
import { perfilRotas } from '@/rotas/perfil.rotas';
import { saudeRotas } from '@/rotas/saude.rotas';

// Agregador montado em `/api/v1` (servidor.ts). Cada recurso de dominio
// entra aqui conforme sua issue chega.
export const rotas = Router();

rotas.use(saudeRotas);
rotas.use(autenticacaoRotas);
rotas.use(perfilRotas);
rotas.use(contasRotas);
rotas.use(categoriasRotas);
rotas.use(etiquetasRotas);
