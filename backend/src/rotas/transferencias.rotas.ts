import { Router } from 'express';
import { TransferenciaControlador } from '@/controladores/transferencia.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  criarTransferenciaSchema,
  idTransferenciaSchema,
} from '@/validadores/transferencia.validador';

export const transferenciasRotas = Router();
const controlador = new TransferenciaControlador();

transferenciasRotas.use(autenticar);

transferenciasRotas.post('/transferencias', validar(criarTransferenciaSchema), controlador.criar);
transferenciasRotas.get(
  '/transferencias/:transferenciaId',
  validar(idTransferenciaSchema),
  controlador.buscarPorId,
);
transferenciasRotas.delete(
  '/transferencias/:transferenciaId',
  validar(idTransferenciaSchema),
  controlador.excluir,
);
