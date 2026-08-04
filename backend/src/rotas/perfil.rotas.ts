import { Router } from 'express';
import {
  LIMITE_UPLOADS_AVATAR_POR_HORA,
  MINUTOS_JANELA_UPLOAD_AVATAR,
} from '@/configuracao/constantes';
import { PerfilControlador } from '@/controladores/perfil.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { limitador } from '@/middlewares/limitador.middleware';
import { uploadAvatar } from '@/middlewares/upload.middleware';
import { validar } from '@/middlewares/validar.middleware';
import { atualizarPerfilSchema } from '@/validadores/perfil.validador';

export const perfilRotas = Router();
const controlador = new PerfilControlador();

perfilRotas.use(autenticar);

const limitadorUpload = limitador({
  janelaMinutos: MINUTOS_JANELA_UPLOAD_AVATAR,
  maximo: LIMITE_UPLOADS_AVATAR_POR_HORA,
});

perfilRotas.get('/perfil', controlador.consultar);
perfilRotas.patch('/perfil', validar(atualizarPerfilSchema), controlador.atualizar);
perfilRotas.post(
  '/perfil/foto',
  limitadorUpload,
  uploadAvatar.single('foto'),
  controlador.atualizarFoto,
);
perfilRotas.delete('/perfil/foto', controlador.removerFoto);
