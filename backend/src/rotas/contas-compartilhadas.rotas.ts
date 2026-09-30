import { Router } from 'express';
import { ContaCompartilhadaControlador } from '@/controladores/conta-compartilhada.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { autorizarCompartilhada } from '@/middlewares/autorizar-compartilhada.middleware';
import { uploadAvatar } from '@/middlewares/upload.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  alterarPapelMembroSchema,
  atualizarContaCompartilhadaSchema,
  criarContaCompartilhadaSchema,
  excluirContaCompartilhadaSchema,
  idParamSchema,
  membroIdParamSchema,
  transferirAdministracaoSchema,
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
// Nivel 2 (02-ARCHITECTURE.md §8.3): toda rota de escopo de grupo passa por
// autorizarCompartilhada — sem papeis, aceita qualquer membro ativo; com
// papeis, restringe a eles (RN-30). Nao membro/membro inativo cai em 404
// dentro do proprio middleware, antes de qualquer logica de negocio.
contasCompartilhadasRotas.get(
  '/contas-compartilhadas/:contaCompartilhadaId',
  validar(idParamSchema),
  autorizarCompartilhada(),
  controlador.buscarPorId,
);
contasCompartilhadasRotas.patch(
  '/contas-compartilhadas/:contaCompartilhadaId',
  validar(atualizarContaCompartilhadaSchema),
  autorizarCompartilhada('ADMINISTRADOR'),
  controlador.atualizar,
);
contasCompartilhadasRotas.delete(
  '/contas-compartilhadas/:contaCompartilhadaId',
  validar(excluirContaCompartilhadaSchema),
  autorizarCompartilhada('ADMINISTRADOR'),
  controlador.excluir,
);
contasCompartilhadasRotas.post(
  '/contas-compartilhadas/:contaCompartilhadaId/imagem',
  validar(idParamSchema),
  autorizarCompartilhada('ADMINISTRADOR'),
  uploadAvatar.single('imagem'),
  controlador.atualizarImagem,
);

contasCompartilhadasRotas.get(
  '/contas-compartilhadas/:contaCompartilhadaId/membros',
  validar(idParamSchema),
  autorizarCompartilhada(),
  controlador.listarMembros,
);
contasCompartilhadasRotas.patch(
  '/contas-compartilhadas/:contaCompartilhadaId/membros/:membroId',
  validar(alterarPapelMembroSchema),
  autorizarCompartilhada('ADMINISTRADOR'),
  controlador.alterarPapelMembro,
);
contasCompartilhadasRotas.delete(
  '/contas-compartilhadas/:contaCompartilhadaId/membros/:membroId',
  validar(membroIdParamSchema),
  autorizarCompartilhada('ADMINISTRADOR'),
  controlador.removerMembro,
);
contasCompartilhadasRotas.post(
  '/contas-compartilhadas/:contaCompartilhadaId/transferir-administracao',
  validar(transferirAdministracaoSchema),
  autorizarCompartilhada('ADMINISTRADOR'),
  controlador.transferirAdministracao,
);
contasCompartilhadasRotas.post(
  '/contas-compartilhadas/:contaCompartilhadaId/sair',
  validar(idParamSchema),
  autorizarCompartilhada(),
  controlador.sair,
);
