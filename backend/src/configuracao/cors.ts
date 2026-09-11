import { ambiente } from '@/configuracao/ambiente';
import type { CorsOptions } from 'cors';

export const opcoesCors: CorsOptions = {
  origin: ambiente.ORIGENS_PERMITIDAS,
  credentials: true,
};
