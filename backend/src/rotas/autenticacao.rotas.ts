import { Router } from 'express';
import {
  LIMITE_RENOVACAO_POR_IP,
  LIMITE_TENTATIVAS_LOGIN,
  MINUTOS_BLOQUEIO_LOGIN,
  MINUTOS_JANELA_RENOVACAO,
} from '@/configuracao/constantes';
import { AutenticacaoControlador } from '@/controladores/autenticacao.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { limitador } from '@/middlewares/limitador.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  cadastrarSchema,
  entrarSchema,
  type EntrarDTO,
} from '@/validadores/autenticacao.validador';

export const autenticacaoRotas = Router();
const controlador = new AutenticacaoControlador();

// RN-54: 5 tentativas por IP+e-mail em 15 min — complementa o bloqueio por
// conta que o servico aplica (403 CONTA_BLOQUEADA), com um teto por IP.
const limitadorLogin = limitador({
  janelaMinutos: MINUTOS_BLOQUEIO_LOGIN,
  maximo: LIMITE_TENTATIVAS_LOGIN,
  chaveExtra: (req) => (req.body as EntrarDTO).email.toLowerCase(),
});

const limitadorRenovacao = limitador({
  janelaMinutos: MINUTOS_JANELA_RENOVACAO,
  maximo: LIMITE_RENOVACAO_POR_IP,
});

autenticacaoRotas.post('/autenticacao/cadastrar', validar(cadastrarSchema), controlador.cadastrar);
autenticacaoRotas.post(
  '/autenticacao/entrar',
  validar(entrarSchema),
  limitadorLogin,
  controlador.entrar,
);
autenticacaoRotas.post('/autenticacao/renovar', limitadorRenovacao, controlador.renovar);
autenticacaoRotas.post('/autenticacao/sair', autenticar, controlador.sair);
autenticacaoRotas.post('/autenticacao/sair-todos', autenticar, controlador.sairTodos);
