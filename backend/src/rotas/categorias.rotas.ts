import { Router } from 'express';
import { CategoriaControlador } from '@/controladores/categoria.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { validar } from '@/middlewares/validar.middleware';
import {
  atualizarCategoriaSchema,
  criarCategoriaSchema,
  excluirCategoriaSchema,
  idParamCategoriaSchema,
  listarCategoriasSchema,
} from '@/validadores/categorias.validador';

export const categoriasRotas = Router();
const controlador = new CategoriaControlador();

categoriasRotas.use(autenticar);

categoriasRotas.get('/categorias', validar(listarCategoriasSchema), controlador.listar);
categoriasRotas.get('/categorias/:id', validar(idParamCategoriaSchema), controlador.buscarPorId);
categoriasRotas.post('/categorias', validar(criarCategoriaSchema), controlador.criar);
categoriasRotas.patch('/categorias/:id', validar(atualizarCategoriaSchema), controlador.atualizar);
categoriasRotas.delete('/categorias/:id', validar(excluirCategoriaSchema), controlador.excluir);
