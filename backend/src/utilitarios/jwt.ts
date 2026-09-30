import jwt from 'jsonwebtoken';
import { ambiente } from '@/configuracao/ambiente';

export interface PayloadAccessToken {
  sub: string;
  email: string;
}

export function assinarAccessToken(payload: PayloadAccessToken): string {
  return jwt.sign(payload, ambiente.JWT_SEGREDO, {
    // ambiente.JWT_EXPIRACAO e validado por Zod como string livre, nao no
    // tipo literal restrito que a lib `ms` exige — o proprio jwt.sign usa
    // `ms` por baixo para interpretar o mesmo formato em runtime.
    expiresIn: ambiente.JWT_EXPIRACAO as NonNullable<jwt.SignOptions['expiresIn']>,
  });
}

export function verificarAccessToken(token: string): PayloadAccessToken {
  return jwt.verify(token, ambiente.JWT_SEGREDO) as PayloadAccessToken;
}

const MILISSEGUNDOS_POR_UNIDADE: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Converte o formato aceito por JWT_EXPIRACAO ("15m", "900s", "1h") em
 * segundos, para o campo `expiraEm` da resposta de login (04-API.md §7.2).
 * O jsonwebtoken faz seu proprio parsing para assinar o token; esta funcao
 * so espelha o mesmo calculo para informar o cliente. */
export function duracaoEmSegundos(duracao: string): number {
  const casamento = /^(\d+)(s|m|h|d)$/.exec(duracao.trim());
  const quantidade = casamento?.[1];
  const unidade = casamento?.[2];
  const emMilissegundos = unidade ? MILISSEGUNDOS_POR_UNIDADE[unidade] : undefined;

  if (!quantidade || !emMilissegundos) {
    throw new Error(`Formato de duracao invalido: "${duracao}". Use algo como "15m" ou "900s".`);
  }

  return (Number(quantidade) * emMilissegundos) / 1000;
}
