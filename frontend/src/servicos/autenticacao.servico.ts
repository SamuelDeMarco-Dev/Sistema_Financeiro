import type { RespostaSucesso } from '@/tipos/api';
import type { Usuario } from '@/tipos/usuario';
import { api } from './api';

export interface CredenciaisLogin {
  email: string;
  senha: string;
  lembrarMe?: boolean;
}

export interface DadosCadastro {
  nome: string;
  email: string;
  senha: string;
  confirmacaoSenha: string;
}

export interface RespostaLogin {
  accessToken: string;
  expiraEm: number;
  usuario: Usuario;
}

export interface UsuarioCadastrado {
  id: string;
  nome: string;
  email: string;
  emailVerificado: boolean;
  criadoEm: string;
}

export async function entrar(credenciais: CredenciaisLogin): Promise<RespostaLogin> {
  const resposta = await api.post<RespostaSucesso<RespostaLogin>>(
    '/autenticacao/entrar',
    credenciais,
  );
  return resposta.data.data;
}

export async function cadastrar(dados: DadosCadastro): Promise<UsuarioCadastrado> {
  const resposta = await api.post<RespostaSucesso<{ usuario: UsuarioCadastrado }>>(
    '/autenticacao/cadastrar',
    dados,
  );
  return resposta.data.data.usuario;
}

// 204 No Content — sem corpo para desempacotar.
export async function sair(): Promise<void> {
  await api.post('/autenticacao/sair');
}
