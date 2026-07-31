import type { CorsOptions } from 'cors';

// TODO(#4): consumir a partir de `ambiente.ORIGENS_PERMITIDAS` assim que a
// validacao de variaveis de ambiente existir.
const origensPermitidas = (process.env['ORIGENS_PERMITIDAS'] ?? 'http://localhost:5173')
  .split(',')
  .map((origem) => origem.trim());

export const opcoesCors: CorsOptions = {
  origin: origensPermitidas,
  credentials: true,
};
