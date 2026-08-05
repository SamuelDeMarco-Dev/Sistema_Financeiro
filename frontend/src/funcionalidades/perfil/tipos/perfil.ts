import type { Tema } from '@/contextos/ContextoTema';

// Espelha PerfilCompleto do backend (backend/src/utilitarios/mapear-perfil.ts)
// — devolvido por GET /perfil. Mais rico que Usuario: usado pela pagina de
// configuracoes (issue #21) e para restaurar a sessao no boot (issue #18),
// ja que /autenticacao/renovar nao devolve dados do usuario.
export interface PerfilCompleto {
  id: string;
  nome: string;
  email: string;
  emailVerificado: boolean;
  fotoUrl: string | null;
  moedaPadrao: string;
  idioma: string;
  tema: Tema;
  timezone: string;
  formatoData: string;
  primeiroDiaSemana: number;
  notificacoesApp: boolean;
  notificacoesEmail: boolean;
  criadoEm: string;
}
