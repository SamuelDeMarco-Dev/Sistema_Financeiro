import { Router } from 'express';
import { ContaControlador } from '@/controladores/conta.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  atualizarContaSchema,
  criarContaSchema,
  idParamSchema,
  listarContasSchema,
  reordenarContasSchema,
} from '@/validadores/contas.validador';

export const contasRotas = Router();
const controlador = new ContaControlador();

contasRotas.use(autenticar);

// `/resumo` e `/reordenar` precisam vir antes de `/:id`, senao o Express
// os trata como valor de `:id`.
contasRotas.get('/contas', validar(listarContasSchema), controlador.listar);
contasRotas.get('/contas/resumo', controlador.listarResumo);
contasRotas.patch('/contas/reordenar', validar(reordenarContasSchema), controlador.reordenar);
contasRotas.get('/contas/:id', validar(idParamSchema), controlador.buscarPorId);
contasRotas.post('/contas', validar(criarContaSchema), controlador.criar);
contasRotas.patch('/contas/:id', validar(atualizarContaSchema), controlador.atualizar);
contasRotas.patch('/contas/:id/arquivar', validar(idParamSchema), controlador.arquivar);
contasRotas.patch('/contas/:id/desarquivar', validar(idParamSchema), controlador.desarquivar);
contasRotas.delete('/contas/:id', validar(idParamSchema), controlador.excluir);
