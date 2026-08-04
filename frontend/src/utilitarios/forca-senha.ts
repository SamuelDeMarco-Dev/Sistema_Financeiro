export type NivelForcaSenha = 'FRACA' | 'MEDIA' | 'FORTE' | 'MUITO_FORTE';

export interface ForcaSenha {
  pontuacao: number; // 0-5
  nivel: NivelForcaSenha;
  rotulo: string;
}

function classificar(pontuacao: number): { nivel: NivelForcaSenha; rotulo: string } {
  if (pontuacao >= 5) return { nivel: 'MUITO_FORTE', rotulo: 'Muito forte' };
  if (pontuacao >= 4) return { nivel: 'FORTE', rotulo: 'Forte' };
  if (pontuacao >= 3) return { nivel: 'MEDIA', rotulo: 'Media' };
  return { nivel: 'FRACA', rotulo: 'Fraca' };
}

/**
 * Heuristica simples (nao criptografica) so para dar feedback visual
 * imediato no cadastro — a regra que efetivamente barra senhas fracas e' o
 * schema Zod (senhaSchema em validadores/autenticacao.validador.ts),
 * espelhado do backend.
 */
export function calcularForcaSenha(senha: string): ForcaSenha {
  if (senha.length === 0) {
    return { pontuacao: 0, nivel: 'FRACA', rotulo: 'Fraca' };
  }

  let pontuacao = 0;
  if (senha.length >= 8) pontuacao += 1;
  if (senha.length >= 12) pontuacao += 1;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontuacao += 1;
  if (/\d/.test(senha)) pontuacao += 1;
  if (/[^A-Za-z0-9]/.test(senha)) pontuacao += 1;

  return { pontuacao, ...classificar(pontuacao) };
}
