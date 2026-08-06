import { Router } from 'express';
import {
  LIMITE_UPLOADS_ANEXO_POR_HORA,
  MINUTOS_JANELA_UPLOAD_ANEXO,
} from '@/configuracao/constantes';
import { AnexoControlador } from '@/controladores/anexo.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { limitador } from '@/middlewares/limitador.middleware';
import { uploadAnexo } from '@/middlewares/upload.middleware';
import { validar } from '@/middlewares/validar.middleware';
import { enviarAnexoSchema, idAnexoSchema } from '@/validadores/anexo.validador';

export const anexosRotas = Router();
const controlador = new AnexoControlador();

anexosRotas.use(autenticar);

const limitadorUpload = limitador({
  janelaMinutos: MINUTOS_JANELA_UPLOAD_ANEXO,
  maximo: LIMITE_UPLOADS_ANEXO_POR_HORA,
});

anexosRotas.post(
  '/movimentacoes/:id/anexos',
  limitadorUpload,
  uploadAnexo.array('arquivo', 5),
  validar(enviarAnexoSchema),
  controlador.enviar,
);
anexosRotas.get('/anexos/:id/conteudo', validar(idAnexoSchema), controlador.baixar);
anexosRotas.delete('/anexos/:id', validar(idAnexoSchema), controlador.excluir);
