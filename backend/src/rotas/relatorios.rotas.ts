import { Router } from 'express';
import { RelatorioControlador } from '@/controladores/relatorio.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  obterRelatorioAnualSchema,
  obterRelatorioMensalSchema,
} from '@/validadores/relatorios.validador';

export const relatoriosRotas = Router();
const controlador = new RelatorioControlador();

relatoriosRotas.use(autenticar);

relatoriosRotas.get('/relatorios/mensal', validar(obterRelatorioMensalSchema), controlador.mensal);
relatoriosRotas.get('/relatorios/anual', validar(obterRelatorioAnualSchema), controlador.anual);
