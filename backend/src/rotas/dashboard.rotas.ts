import { Router } from 'express';
import { DashboardControlador } from '@/controladores/dashboard.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  obterFluxoCaixaSchema,
  obterIndicadoresSchema,
  obterPorCategoriaSchema,
} from '@/validadores/dashboard.validador';

export const dashboardRotas = Router();
const controlador = new DashboardControlador();

dashboardRotas.use(autenticar);

dashboardRotas.get(
  '/dashboard/indicadores',
  validar(obterIndicadoresSchema),
  controlador.indicadores,
);
dashboardRotas.get(
  '/dashboard/fluxo-caixa',
  validar(obterFluxoCaixaSchema),
  controlador.fluxoCaixa,
);
dashboardRotas.get(
  '/dashboard/por-categoria',
  validar(obterPorCategoriaSchema),
  controlador.porCategoria,
);
