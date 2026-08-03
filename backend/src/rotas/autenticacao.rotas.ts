import { Router } from 'express';
import { AutenticacaoControlador } from '@/controladores/autenticacao.controlador';
import { validar } from '@/middlewares/validar.middleware';
import { cadastrarSchema } from '@/validadores/autenticacao.validador';

export const autenticacaoRotas = Router();
const controlador = new AutenticacaoControlador();

autenticacaoRotas.post('/autenticacao/cadastrar', validar(cadastrarSchema), controlador.cadastrar);
