import { Router } from 'express';
import { anexosRotas } from '@/rotas/anexos.rotas';
import { autenticacaoRotas } from '@/rotas/autenticacao.rotas';
import { categoriasRotas } from '@/rotas/categorias.rotas';
import { contasCompartilhadasRotas } from '@/rotas/contas-compartilhadas.rotas';
import { contasRotas } from '@/rotas/contas.rotas';
import { convitesRotas } from '@/rotas/convites.rotas';
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
// convitesRotas precisa vir ANTES de qualquer roteador com `.use(autenticar)`
// sem caminho (perfilRotas, contasRotas, ...) — dentro do agregador, esse
// `.use()' roda para toda requisicao que atravessa aquele roteador,
// nao so para as rotas dele; a rota publica GET /convites/token/:token
// (unica sem autenticacao neste agregador, alem de saude/autenticacao)
// seria bloqueada com 401 antes de chegar aqui se ficasse depois.
rotas.use(convitesRotas);
rotas.use(perfilRotas);
rotas.use(contasRotas);
rotas.use(contasCompartilhadasRotas);
rotas.use(categoriasRotas);
rotas.use(etiquetasRotas);
rotas.use(movimentacoesRotas);
rotas.use(transferenciasRotas);
rotas.use(anexosRotas);
rotas.use(dashboardRotas);
rotas.use(relatoriosRotas);
