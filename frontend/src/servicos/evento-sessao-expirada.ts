type Ouvinte = () => void;

const ouvintes = new Set<Ouvinte>();

/**
 * Emitido quando uma renovacao REATIVA (401 numa requisicao autenticada, em
 * pleno uso do app) falha — refresh token expirado ou revogado enquanto o
 * usuario navegava. O ContextoAutenticacao escuta isto para limpar
 * `usuario`; a propria RotaProtegida redireciona a /entrar no proximo
 * render (nenhuma navegacao imperativa acontece aqui).
 *
 * Um modulo plano (nao um hook) porque quem dispara o evento e
 * interceptor-renovacao.ts, fora de qualquer componente React.
 */
export function notificarSessaoExpirada(): void {
  ouvintes.forEach((ouvinte) => {
    ouvinte();
  });
}

export function inscreverSessaoExpirada(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
