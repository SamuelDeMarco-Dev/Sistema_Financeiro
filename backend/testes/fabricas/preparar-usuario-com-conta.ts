import { fabricarCategoria } from './categoria.fabrica';
import { fabricarConta } from './conta.fabrica';
import { fabricarUsuario } from './usuario.fabrica';
import type { Categoria, Conta, Usuario } from '@prisma/client';

export interface UsuarioComConta {
  usuario: Usuario;
  accessToken: string;
  conta: Conta;
  categoria: Categoria;
}

/** Fixture mais usada pelos testes de integracao desta Milestone: um
 * usuario autenticado, com uma conta e uma categoria proprias, prontos
 * para os testes de contas/categorias/etiquetas que nao precisam
 * exercitar o fluxo de cadastro em si. */
export async function prepararUsuarioComConta(): Promise<UsuarioComConta> {
  const { usuario, accessToken } = await fabricarUsuario();
  const conta = await fabricarConta(usuario.id);
  const categoria = await fabricarCategoria(usuario.id);

  return { usuario, accessToken, conta, categoria };
}
