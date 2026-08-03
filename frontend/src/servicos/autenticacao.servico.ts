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

export async function verificarEmail(token: string): Promise<void> {
  await api.post('/autenticacao/verificar-email', { token });
}

// Sempre 200 com a mesma mensagem, exista ou nao a conta — o backend nao
// revela quais e-mails estao cadastrados (mesmo padrao de esqueci-senha).
export async function reenviarVerificacao(email: string): Promise<void> {
  await api.post('/autenticacao/reenviar-verificacao', { email });
}
