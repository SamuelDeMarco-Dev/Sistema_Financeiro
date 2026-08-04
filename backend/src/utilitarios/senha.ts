import bcrypt from 'bcrypt';
import { ambiente } from '@/configuracao/ambiente';

/** RN-52: bcrypt custo `BCRYPT_CUSTO` (padrao 12). */
export async function gerarHash(senha: string): Promise<string> {
  return bcrypt.hash(senha, ambiente.BCRYPT_CUSTO);
}

export async function comparar(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
