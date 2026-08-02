import axios, { AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { armazenamentoToken } from './armazenamento-token';
import { criarInterceptorRenovacao } from './interceptor-renovacao';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

vi.mock('axios', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('axios')>();
  return {
    ...real,
    default: { ...real.default, post: vi.fn() },
  };
});

function fabricarErro401(): AxiosError {
  const config: InternalAxiosRequestConfig = {
    headers: new AxiosHeaders(),
  } as InternalAxiosRequestConfig;

  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Request failed with status code 401',
    config,
    response: { status: 401, data: {}, statusText: '', headers: {}, config },
    toJSON: () => ({}),
  } as AxiosError;
}

describe('criarInterceptorRenovacao', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
    armazenamentoToken.definir(null);
  });

  it('cinco requisicoes 401 simultaneas disparam apenas UMA chamada a /autenticacao/renovar', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { data: { accessToken: 'token-novo' } } });

    const instanciaFake = vi.fn().mockResolvedValue({ data: 'ok' }) as unknown as AxiosInstance;
    (instanciaFake as unknown as { defaults: { baseURL: string } }).defaults = {
      baseURL: 'http://localhost:3333/api/v1',
    };

    const interceptor = criarInterceptorRenovacao(instanciaFake);

    await Promise.all(Array.from({ length: 5 }, () => interceptor(fabricarErro401())));

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/autenticacao/renovar',
      {},
      { withCredentials: true },
    );
    expect(instanciaFake).toHaveBeenCalledTimes(5);
    expect(armazenamentoToken.obter()).toBe('token-novo');
  });

  it('rejeita com ErroApi (nao com o AxiosError cru) quando o status nao e 401', async () => {
    const instanciaFake = vi.fn() as unknown as AxiosInstance;
    (instanciaFake as unknown as { defaults: { baseURL: string } }).defaults = {
      baseURL: 'http://x',
    };
    const interceptor = criarInterceptorRenovacao(instanciaFake);

    const erro500 = fabricarErro401();
    erro500.response = { ...erro500.response, status: 500 } as never;

    await expect(interceptor(erro500)).rejects.toMatchObject({ name: 'ErroApi' });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('nao tenta renovar duas vezes a mesma requisicao (evita loop infinito)', async () => {
    const instanciaFake = vi.fn() as unknown as AxiosInstance;
    (instanciaFake as unknown as { defaults: { baseURL: string } }).defaults = {
      baseURL: 'http://x',
    };
    const interceptor = criarInterceptorRenovacao(instanciaFake);

    const erro = fabricarErro401();
    (erro.config as InternalAxiosRequestConfig & { _jaTentouRenovar?: boolean })._jaTentouRenovar =
      true;

    await expect(interceptor(erro)).rejects.toMatchObject({ name: 'ErroApi' });
    expect(axios.post).not.toHaveBeenCalled();
  });
});
