import { Router } from 'express';
import {
  LIMITE_CONVITES_POR_HORA,
  LIMITE_PREVISUALIZACAO_CONVITE_POR_IP,
  MINUTOS_JANELA_CONVITES,
  MINUTOS_JANELA_PREVISUALIZACAO_CONVITE,
} from '@/configuracao/constantes';
import { ConviteControlador } from '@/controladores/convite.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { autorizarCompartilhada } from '@/middlewares/autorizar-compartilhada.middleware';
import { limitador } from '@/middlewares/limitador.middleware';
import { validar } from '@/middlewares/validar.middleware';
import { idParamSchema } from '@/validadores/contas-compartilhadas.validador';
import {
  conviteIdParamSchema,
  enviarConviteSchema,
  tokenConviteParamSchema,
} from '@/validadores/convites.validador';

export const convitesRotas = Router();
const controlador = new ConviteControlador();

// Publica (04-API.md §17.3) — precisa vir ANTES do `use(autenticar)`
// abaixo: middleware/rota do Express roda na ordem de registro, entao uma
// rota definida depois de um `use()` sem path herda esse middleware, mas
// uma definida antes, nao.
const limitadorPrevisualizacao = limitador({
  janelaMinutos: MINUTOS_JANELA_PREVISUALIZACAO_CONVITE,
  maximo: LIMITE_PREVISUALIZACAO_CONVITE_POR_IP,
});
convitesRotas.get(
  '/convites/token/:token',
  limitadorPrevisualizacao,
  validar(tokenConviteParamSchema),
  controlador.buscarPreviaPorToken,
);

convitesRotas.use(autenticar);

const limitadorConvites = limitador({
  janelaMinutos: MINUTOS_JANELA_CONVITES,
  maximo: LIMITE_CONVITES_POR_HORA,
  chaveExtra: (req) => req.usuario.id,
});

// Aninhadas ao grupo (04-API.md §17.1/rotas): passam por
// autorizarCompartilhada — administrador do grupo, RN-51 via 404.
convitesRotas.post(
  '/contas-compartilhadas/:contaCompartilhadaId/convites',
  validar(enviarConviteSchema),
  limitadorConvites,
  autorizarCompartilhada('ADMINISTRADOR'),
  controlador.enviar,
);
convitesRotas.get(
  '/contas-compartilhadas/:contaCompartilhadaId/convites',
  validar(idParamSchema),
  autorizarCompartilhada('ADMINISTRADOR'),
  controlador.listarPorGrupo,
);

// Nao aninhadas — nao tem contaCompartilhadaId na URL, entao nao passam
// pelo middleware de rota; a autorizacao especifica de cada uma vive no
// ConviteServico (email do convidado, ou administrador do grupo do
// PROPRIO convite alvo).
convitesRotas.get('/convites/recebidos', controlador.listarRecebidos);
convitesRotas.post('/convites/:id/aceitar', validar(conviteIdParamSchema), controlador.aceitar);
convitesRotas.post('/convites/:id/recusar', validar(conviteIdParamSchema), controlador.recusar);
convitesRotas.delete('/convites/:id', validar(conviteIdParamSchema), controlador.cancelar);
