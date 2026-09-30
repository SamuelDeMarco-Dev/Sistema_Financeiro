import { describe, expect, it } from 'vitest';
import { assinarAccessToken, duracaoEmSegundos, verificarAccessToken } from '@/utilitarios/jwt';

describe('utilitarios/jwt', () => {
  it('assina e verifica um access token com sub e email', () => {
    const token = assinarAccessToken({ sub: 'usuario-1', email: 'samuel@exemplo.com' });
    const payload = verificarAccessToken(token);

    expect(payload.sub).toBe('usuario-1');
    expect(payload.email).toBe('samuel@exemplo.com');
  });

  it('verificarAccessToken lanca para um token invalido', () => {
    expect(() => verificarAccessToken('token-invalido')).toThrow();
  });

  it.each([
    ['15m', 900],
    ['900s', 900],
    ['1h', 3600],
    ['1d', 86_400],
  ])('duracaoEmSegundos("%s") === %i', (duracao, esperado) => {
    expect(duracaoEmSegundos(duracao)).toBe(esperado);
  });

  it('duracaoEmSegundos lanca para formato invalido', () => {
    expect(() => duracaoEmSegundos('quinze minutos')).toThrow();
  });
});
