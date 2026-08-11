import { Router } from 'express';
import { ContaCompartilhadaControlador } from '@/controladores/conta-compartilhada.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { uploadAvatar } from '@/middlewares/upload.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  atualizarContaCompartilhadaSchema,
  criarContaCompartilhadaSchema,
  excluirContaCompartilhadaSchema,
  idParamSchema,
} from '@/validadores/contas-compartilhadas.validador';

export const contasCompartilhadasRotas = Router();
const controlador = new ContaCompartilhadaControlador();

contasCompartilhadasRotas.use(autenticar);

contasCompartilhadasRotas.get('/contas-compartilhadas', controlador.listar);
contasCompartilhadasRotas.post(
  '/contas-compartilhadas',
  validar(criarContaCompartilhadaSchema),
  controlador.criar,
);
contasCompartilhadasRotas.get(
  '/contas-compartilhadas/:id',
  validar(idParamSchema),
  controlador.buscarPorId,
);
contasCompartilhadasRotas.patch(
  '/contas-compartilhadas/:id',
  validar(atualizarContaCompartilhadaSchema),
  controlador.atualizar,
);
contasCompartilhadasRotas.delete(
  '/contas-compartilhadas/:id',
  validar(excluirContaCompartilhadaSchema),
  controlador.excluir,
);
contasCompartilhadasRotas.post(
  '/contas-compartilhadas/:id/imagem',
  validar(idParamSchema),
  uploadAvatar.single('imagem'),
  controlador.atualizarImagem,
);
