import type { Tema } from '@/contextos/ContextoTema';

// Forma enxuta devolvida por /autenticacao/entrar e /autenticacao/renovar —
// so o necessario para header/sessao. A forma completa (settings, issue
// #21) e PerfilCompleto, em tipos/perfil.ts.
export interface PerfilResumo {
  fotoUrl: string | null;
  moedaPadrao: string;
  idioma: string;
  tema: Tema;
  timezone: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilResumo;
}
