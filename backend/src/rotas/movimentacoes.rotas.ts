import { Router } from 'express';
import { MovimentacaoControlador } from '@/controladores/movimentacao.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  criarMovimentacaoSchema,
  idParamMovimentacaoSchema,
  listarMovimentacoesSchema,
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
