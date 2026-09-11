import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redefinirRenovacaoEmVoo, renovarSessao } from './renovar-sessao';

vi.mock('axios', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('axios')>();
  return {
    ...real,
    default: { ...real.default, post: vi.fn() },
  };
});

const BASE = 'http://localhost:3333/api/v1';

function respostaRenovacao(accessToken: string) {
  return { data: { data: { accessToken, expiraEm: 900 } } };
}

/** O refresh token rotaciona a cada renovacao e o backend trata reuso de
 * token revogado como comprometimento, invalidando a familia inteira
 * (RN-53). Duas renovacoes em paralelo, portanto, nao desperdicam uma
 * chamada: derrubam a sessao. */
describe('renovarSessao', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
    redefinirRenovacaoEmVoo();
  });

  it('chamadas simultaneas compartilham UMA requisicao a /autenticacao/renovar', async () => {
    vi.mocked(axios.post).mockResolvedValue(respostaRenovacao('token-1'));

    const resultados = await Promise.all([
      renovarSessao(BASE),
      renovarSessao(BASE),
      renovarSessao(BASE),
    ]);

    expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(1);
    expect(resultados.map((r) => r.accessToken)).toEqual(['token-1', 'token-1', 'token-1']);
  });

  it('chamadas em sequencia renovam de novo — a protecao nao vira cache', async () => {
    vi.mocked(axios.post)
      .mockResolvedValueOnce(respostaRenovacao('token-1'))
      .mockResolvedValueOnce(respostaRenovacao('token-2'));

    const primeiro = await renovarSessao(BASE);
    const segundo = await renovarSessao(BASE);

    expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(2);
    expect(primeiro.accessToken).toBe('token-1');
    expect(segundo.accessToken).toBe('token-2');
  });

  it('falha nao deixa a renovacao presa: a proxima tentativa refaz a chamada', async () => {
    vi.mocked(axios.post)
      .mockRejectedValueOnce(new Error('401'))
      .mockResolvedValueOnce(respostaRenovacao('token-1'));

    await expect(renovarSessao(BASE)).rejects.toThrow('401');
    await expect(renovarSessao(BASE)).resolves.toMatchObject({ accessToken: 'token-1' });
    expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(2);
  });

  it('as duas chamadas do boot em StrictMode nao rotacionam o token duas vezes', async () => {
    // Reproduz o efeito de boot do ContextoAutenticacao sendo invocado duas
    // vezes pelo StrictMode: as duas partem antes de qualquer resposta.
    vi.mocked(axios.post).mockImplementation(
      () =>
        new Promise((resolver) => {
          setTimeout(() => {
            resolver(respostaRenovacao('token-boot'));
          }, 10);
        }),
    );

    const primeiroEfeito = renovarSessao(BASE);
    const segundoEfeito = renovarSessao(BASE);
    await Promise.all([primeiroEfeito, segundoEfeito]);

    expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(1);
  });
});
