// Access token vive em memoria (nunca localStorage/sessionStorage): um XSS
// que leia o storage nao deve conseguir roubar sessao (02-ARCHITECTURE.md §8.1).
let tokenAtual: string | null = null;

export const armazenamentoToken = {
  obter(): string | null {
    return tokenAtual;
  },
  definir(token: string | null): void {
    tokenAtual = token;
  },
};
