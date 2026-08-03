import type { RespostaSucesso } from '@/tipos/api';
import type { SessaoAtiva } from '@/tipos/sessao';
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

// Idem: sempre 200 com a mesma mensagem, exista ou nao o e-mail (RF-07).
export async function esqueciSenha(email: string): Promise<void> {
  await api.post('/autenticacao/esqueci-senha', { email });
}

export interface DadosRedefinicaoSenha {
  token: string;
  senha: string;
  confirmacaoSenha: string;
}

// 200 revoga TODOS os refresh tokens do usuario (sessao anterior invalidada
// — login e' obrigatorio depois). 400 VALIDACAO: token invalido/expirado (1h).
export async function redefinirSenha(dados: DadosRedefinicaoSenha): Promise<void> {
  await api.post('/autenticacao/redefinir-senha', dados);
}

export interface DadosAlterarSenha {
  senhaAtual: string;
  senhaNova: string;
  confirmacaoSenha: string;
}

// 200 revoga as demais sessoes, mantem a atual (04-API.md §7.8).
export async function alterarSenha(dados: DadosAlterarSenha): Promise<void> {
  await api.patch('/autenticacao/alterar-senha', dados);
}

export async function listarSessoes(): Promise<SessaoAtiva[]> {
  const resposta =
    await api.get<RespostaSucesso<{ sessoes: SessaoAtiva[] }>>('/autenticacao/sessoes');
  return resposta.data.data.sessoes;
}

export async function revogarSessao(id: string): Promise<void> {
  await api.delete(`/autenticacao/sessoes/${id}`);
}
