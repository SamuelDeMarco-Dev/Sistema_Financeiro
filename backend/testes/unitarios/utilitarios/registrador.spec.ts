import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { contextoRequisicao, criarRegistradorTeste } from '@/utilitarios/registrador';

function fabricarDestinoCapturavel(): { destino: Writable; linhas: () => Record<string, unknown>[] } {
  const bruto: string[] = [];
  const destino = new Writable({
    write(chunk, _codificacao, callback) {
      bruto.push(chunk.toString());
      callback();
    },
  });

  return {
    destino,
    linhas: () =>
      bruto
        .join('')
        .split('\n')
        .filter((linha) => linha.trim().length > 0)
        .map((linha) => JSON.parse(linha) as Record<string, unknown>),
  };
}

describe('utilitarios/registrador', () => {
  it('redige senha, senhaHash, token, authorization e cookie em qualquer profundidade', () => {
    const { destino, linhas } = fabricarDestinoCapturavel();
    const registrador = criarRegistradorTeste(destino);

    registrador.info({
      senha: 'minhaSenha123',
      req: {
        headers: { authorization: 'Bearer abc.def.ghi', cookie: 'refreshToken=xyz' },
        body: { senhaHash: '$2b$12$segredo', token: 'segredo-tambem' },
      },
    });

    const bruto = JSON.stringify(linhas()[0]);
    expect(bruto).not.toContain('minhaSenha123');
    expect(bruto).not.toContain('Bearer abc.def.ghi');
    expect(bruto).not.toContain('refreshToken=xyz');
    expect(bruto).not.toContain('$2b$12$segredo');
    expect(bruto).not.toContain('segredo-tambem');
    expect(bruto).toContain('[REDACAO]');
  });

  it('nao redige campos que nao estao na lista de redacao', () => {
    const { destino, linhas } = fabricarDestinoCapturavel();
    const registrador = criarRegistradorTeste(destino);

    registrador.info({ metodo: 'GET', rota: '/api/v1/saude', status: 200 });

    expect(linhas()[0]).toMatchObject({ metodo: 'GET', rota: '/api/v1/saude', status: 200 });
  });

  it('injeta requestId do AsyncLocalStorage em todo log emitido dentro do contexto', () => {
    const { destino, linhas } = fabricarDestinoCapturavel();
    const registrador = criarRegistradorTeste(destino);

    contextoRequisicao.run({ requestId: 'req-123' }, () => {
      registrador.info('dentro do contexto');
    });
    registrador.info('fora do contexto');

    const [comContexto, semContexto] = linhas();
    expect(comContexto).toMatchObject({ requestId: 'req-123' });
    expect(semContexto?.['requestId']).toBeUndefined();
  });
});
