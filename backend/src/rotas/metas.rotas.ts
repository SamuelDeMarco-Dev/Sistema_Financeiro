import { Router } from 'express';
import { MetaControlador } from '@/controladores/meta.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  atualizarMetaSchema,
  criarMetaSchema,
  idParamMetaSchema,
  listarMetasSchema,
} from '@/validadores/metas.validador';

export const metasRotas = Router();
const controlador = new MetaControlador();

metasRotas.use(autenticar);

metasRotas.get('/metas', validar(listarMetasSchema), controlador.listar);
metasRotas.get('/metas/:id', validar(idParamMetaSchema), controlador.buscarPorId);
metasRotas.post('/metas', validar(criarMetaSchema), controlador.criar);
metasRotas.patch('/metas/:id', validar(atualizarMetaSchema), controlador.atualizar);
metasRotas.delete('/metas/:id', validar(idParamMetaSchema), controlador.excluir);
