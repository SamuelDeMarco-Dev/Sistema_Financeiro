import { Router } from 'express';
import { RelatorioControlador } from '@/controladores/relatorio.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  obterRelatorioAnualSchema,
  obterRelatorioFluxoCaixaSchema,
  obterRelatorioMensalSchema,
  obterRelatorioPorCategoriaSchema,
  obterRelatorioPorContaSchema,
} from '@/validadores/relatorios.validador';

export const relatoriosRotas = Router();
const controlador = new RelatorioControlador();

relatoriosRotas.use(autenticar);

relatoriosRotas.get('/relatorios/mensal', validar(obterRelatorioMensalSchema), controlador.mensal);
relatoriosRotas.get('/relatorios/anual', validar(obterRelatorioAnualSchema), controlador.anual);
relatoriosRotas.get(
  '/relatorios/por-categoria',
  validar(obterRelatorioPorCategoriaSchema),
  controlador.porCategoria,
);
relatoriosRotas.get(
  '/relatorios/por-conta',
  validar(obterRelatorioPorContaSchema),
  controlador.porConta,
);
relatoriosRotas.get(
  '/relatorios/fluxo-caixa',
  validar(obterRelatorioFluxoCaixaSchema),
  controlador.fluxoCaixa,
);
