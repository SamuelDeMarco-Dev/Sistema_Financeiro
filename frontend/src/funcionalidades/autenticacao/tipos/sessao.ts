// Espelha GET /autenticacao/sessoes (04-API.md §7.9).
export interface SessaoAtiva {
  id: string;
  dispositivo: string;
  ip: string;
  criadoEm: string;
  expiraEm: string;
  atual: boolean;
}
