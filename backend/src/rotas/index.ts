import { Router } from 'express';
import { anexosRotas } from '@/rotas/anexos.rotas';
import { autenticacaoRotas } from '@/rotas/autenticacao.rotas';
import { categoriasRotas } from '@/rotas/categorias.rotas';
import { contasRotas } from '@/rotas/contas.rotas';
import { dashboardRotas } from '@/rotas/dashboard.rotas';
import { etiquetasRotas } from '@/rotas/etiquetas.rotas';
import { movimentacoesRotas } from '@/rotas/movimentacoes.rotas';
import { perfilRotas } from '@/rotas/perfil.rotas';
import { relatoriosRotas } from '@/rotas/relatorios.rotas';
import { saudeRotas } from '@/rotas/saude.rotas';
import { transferenciasRotas } from '@/rotas/transferencias.rotas';

// Agregador montado em `/api/v1` (servidor.ts). Cada recurso de dominio
// entra aqui conforme sua issue chega.
export const rotas = Router();

rotas.use(saudeRotas);
rotas.use(autenticacaoRotas);
rotas.use(perfilRotas);
rotas.use(contasRotas);
rotas.use(categoriasRotas);
rotas.use(etiquetasRotas);
rotas.use(movimentacoesRotas);
rotas.use(transferenciasRotas);
rotas.use(anexosRotas);
rotas.use(dashboardRotas);
rotas.use(relatoriosRotas);
