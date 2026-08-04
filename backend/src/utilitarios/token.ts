import { createHash, randomUUID } from 'node:crypto';

/** Token opaco (nao-JWT) usado como refresh token. */
export function gerarTokenOpaco(): string {
  return randomUUID();
}

/** RN-53: refresh tokens sao persistidos com hash, nunca em texto claro.
 * SHA-256 (nao bcrypt): o token ja e alta entropia por construcao — o
 * custo do bcrypt existe para mitigar senhas fracas, que nao e o caso
 * aqui, e bcrypt trunca em 72 bytes. */
export function hashToken(tokenBruto: string): string {
  return createHash('sha256').update(tokenBruto).digest('hex');
}
