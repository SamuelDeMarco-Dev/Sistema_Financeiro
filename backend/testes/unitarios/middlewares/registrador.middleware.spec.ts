import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registradorRequisicoes } from '@/middlewares/registrador.middleware';
import { registrador } from '@/utilitarios/registrador';
import type { Request, Response } from 'express';

function fabricarResposta(statusCode: number): Response {
  const emissor = new EventEmitter() as unknown as Response;
  (emissor as unknown as { statusCode: number }).statusCode = statusCode;
  return emissor;
}

describe('registradorRequisicoes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loga exatamente um registro, em "finish", com metodo/rota/status/duracaoMs', () => {
    const espiao = vi.spyOn(registrador, 'info').mockImplementation(() => registrador);
    const req = { method: 'GET', originalUrl: '/api/v1/saude', body: {} } as Request;
    const res = fabricarResposta(200);
    const next = vi.fn();

    registradorRequisicoes(req, res, next);
    expect(espiao).not.toHaveBeenCalled(); // so loga quando a resposta termina, nao na entrada

    (res as unknown as EventEmitter).emit('finish');

    expect(next).toHaveBeenCalledOnce();
    expect(espiao).toHaveBeenCalledOnce();
    const [dados] = espiao.mock.calls[0] as [Record<string, unknown>];
    expect(dados).toMatchObject({ metodo: 'GET', rota: '/api/v1/saude', status: 200 });
    expect(typeof dados['duracaoMs']).toBe('number');
  });

  it('nunca inclui req.body no registro, mesmo quando o corpo contem campos sensiveis', () => {
    const espiao = vi.spyOn(registrador, 'info').mockImplementation(() => registrador);
    const req = {
      method: 'POST',
      originalUrl: '/api/v1/autenticacao/entrar',
      body: { email: 'usuario@exemplo.com', senha: 'senhaSecretaDoUsuario' },
    } as Request;
    const res = fabricarResposta(200);

    registradorRequisicoes(req, res, vi.fn());
    (res as unknown as EventEmitter).emit('finish');

    const bruto = JSON.stringify(espiao.mock.calls[0]);
    expect(bruto).not.toContain('senhaSecretaDoUsuario');
    expect(bruto).not.toContain('usuario@exemplo.com');
  });
});
