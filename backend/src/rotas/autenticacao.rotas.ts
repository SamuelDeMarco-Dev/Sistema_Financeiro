import { Router } from 'express';
import { LIMITE_TENTATIVAS_LOGIN, MINUTOS_BLOQUEIO_LOGIN } from '@/configuracao/constantes';
import { AutenticacaoControlador } from '@/controladores/autenticacao.controlador';
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

autenticacaoRotas.post('/autenticacao/cadastrar', validar(cadastrarSchema), controlador.cadastrar);
autenticacaoRotas.post(
  '/autenticacao/entrar',
  validar(entrarSchema),
  limitadorLogin,
  controlador.entrar,
);
