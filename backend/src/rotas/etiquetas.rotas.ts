import { Router } from 'express';
import { EtiquetaControlador } from '@/controladores/etiqueta.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  atualizarEtiquetaSchema,
  criarEtiquetaSchema,
  idParamEtiquetaSchema,
} from '@/validadores/etiquetas.validador';

export const etiquetasRotas = Router();
const controlador = new EtiquetaControlador();

etiquetasRotas.use(autenticar);

etiquetasRotas.get('/etiquetas', controlador.listar);
etiquetasRotas.post('/etiquetas', validar(criarEtiquetaSchema), controlador.criar);
etiquetasRotas.patch('/etiquetas/:id', validar(atualizarEtiquetaSchema), controlador.atualizar);
etiquetasRotas.delete('/etiquetas/:id', validar(idParamEtiquetaSchema), controlador.excluir);
