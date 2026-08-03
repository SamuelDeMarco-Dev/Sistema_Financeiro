// Chaves do React Query centralizadas — evita strings soltas divergindo
// entre quem consulta e quem invalida apos uma mutation (regra 10 do
// CLAUDE.md: toda mutacao invalida o cache em cascata).
export const CHAVES_CONSULTA = {
  perfil: ['perfil'] as const,
  sessoes: ['autenticacao', 'sessoes'] as const,
};
