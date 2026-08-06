import { Router } from 'express';
import { MovimentacaoControlador } from '@/controladores/movimentacao.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  atualizarMovimentacaoSchema,
  criarMovimentacaoSchema,
  duplicarMovimentacaoSchema,
  excluirMovimentacaoSchema,
  idParamMovimentacaoSchema,
  listarMovimentacoesSchema,
  pagarMovimentacaoSchema,
} from '@/validadores/movimentacoes.validador';

export const movimentacoesRotas = Router();
const controlador = new MovimentacaoControlador();

movimentacoesRotas.use(autenticar);

movimentacoesRotas.get('/movimentacoes', validar(listarMovimentacoesSchema), controlador.listar);
movimentacoesRotas.get(
  '/movimentacoes/:id',
  validar(idParamMovimentacaoSchema),
  controlador.buscarPorId,
);
movimentacoesRotas.post('/movimentacoes', validar(criarMovimentacaoSchema), controlador.criar);
movimentacoesRotas.patch(
  '/movimentacoes/:id',
  validar(atualizarMovimentacaoSchema),
  controlador.atualizar,
);
movimentacoesRotas.delete(
  '/movimentacoes/:id',
  validar(excluirMovimentacaoSchema),
  controlador.excluir,
);
movimentacoesRotas.get(
  '/movimentacoes/:id/ocorrencias',
  validar(idParamMovimentacaoSchema),
  controlador.ocorrencias,
);
movimentacoesRotas.post(
  '/movimentacoes/:id/duplicar',
  validar(duplicarMovimentacaoSchema),
  controlador.duplicar,
);
movimentacoesRotas.patch(
  '/movimentacoes/:id/pagar',
  validar(pagarMovimentacaoSchema),
  controlador.pagar,
);
movimentacoesRotas.patch(
  '/movimentacoes/:id/estornar',
  validar(idParamMovimentacaoSchema),
  controlador.estornar,
);
