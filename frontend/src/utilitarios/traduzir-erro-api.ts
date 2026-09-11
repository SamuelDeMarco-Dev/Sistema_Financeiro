import type { ErroApi } from '@/servicos/erro-api';

// 04-API.md §7.2 e RN-54 — mensagens de interface para os codigos que o
// fluxo de autenticacao pode devolver. CREDENCIAIS_INVALIDAS e generico de
// proposito (nao revela se o e-mail existe); EMAIL_NAO_VERIFICADO e
// CONTA_BLOQUEADA tem tela propria (issue #19), nao aparecem so como toast.
const MENSAGENS: Record<string, string> = {
  CREDENCIAIS_INVALIDAS: 'E-mail ou senha incorretos.',
  EMAIL_NAO_VERIFICADO: 'Confirme seu e-mail antes de entrar.',
  CONTA_BLOQUEADA: 'Conta temporariamente bloqueada por excesso de tentativas.',
  LIMITE_EXCEDIDO: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  EMAIL_JA_CADASTRADO: 'Este e-mail ja esta cadastrado.',
  ERRO_REDE: 'Nao foi possivel conectar ao servidor. Verifique sua conexao.',
};

export function traduzirErroApi(erro: ErroApi): string {
  return MENSAGENS[erro.codigo] ?? erro.message;
}
