export type TipoNotificacao = 'sucesso' | 'erro';

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  mensagem: string;
}

type Ouvinte = (notificacoes: Notificacao[]) => void;

const DURACAO_MS = 5000;

let notificacoes: Notificacao[] = [];
const ouvintes = new Set<Ouvinte>();

function emitir(): void {
  ouvintes.forEach((ouvinte) => {
    ouvinte(notificacoes);
  });
}

function adicionar(tipo: TipoNotificacao, mensagem: string): void {
  const notificacao: Notificacao = { id: crypto.randomUUID(), tipo, mensagem };
  notificacoes = [...notificacoes, notificacao];
  emitir();
  setTimeout(() => {
    removerNotificacao(notificacao.id);
  }, DURACAO_MS);
}

/** Imperativo de proposito — precisa ser chamavel de fora de componentes
 * React (ex.: onSuccess/onError de mutations do React Query). */
export const notificar = {
  sucesso: (mensagem: string): void => {
    adicionar('sucesso', mensagem);
  },
  erro: (mensagem: string): void => {
    adicionar('erro', mensagem);
  },
};

export function inscrever(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  ouvinte(notificacoes);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function removerNotificacao(id: string): void {
  notificacoes = notificacoes.filter((notificacao) => notificacao.id !== id);
  emitir();
}
