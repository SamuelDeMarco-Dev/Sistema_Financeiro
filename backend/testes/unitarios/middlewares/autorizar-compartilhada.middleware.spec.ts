import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NaoEncontradoErro, PapelInsuficienteErro } from '@/erros';
import { autorizarCompartilhada } from '@/middlewares/autorizar-compartilhada.middleware';
import type { MembroCompartilhado, PapelMembro } from '@prisma/client';
import type { Request, Response } from 'express';

// autorizar-compartilhada.middleware.ts instancia `new
// ContaCompartilhadaServico()` uma unica vez, no escopo do modulo — mesmo
// raciocinio de autenticar.middleware.spec.ts.
const { buscarMeuMembroAtivoMock } = vi.hoisted(() => ({
  buscarMeuMembroAtivoMock: vi.fn(),
}));

vi.mock('@/servicos/conta-compartilhada.servico', () => ({
  ContaCompartilhadaServico: vi.fn().mockImplementation(function ServicoFalso() {
    return { buscarMeuMembroAtivo: buscarMeuMembroAtivoMock };
  }),
}));

function fabricarRequisicao(usuarioId: string, contaCompartilhadaId: string): Request {
  return {
    usuario: { id: usuarioId, email: 'membro@exemplo.com', nome: 'Membro' },
    params: { contaCompartilhadaId },
  } as unknown as Request;
}

function fabricarMembro(papel: PapelMembro): MembroCompartilhado {
  return {
    id: 'membro-1',
    contaCompartilhadaId: 'grupo-1',
    usuarioId: 'usuario-1',
    papel,
    situacao: 'ATIVO',
    entrouEm: new Date(),
    saiuEm: null,
    convidadoPorId: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };
}

// asyncHandler nao retorna a Promise interna (dispara e esquece, com
// .catch(next)) — esperar pelo proprio next() e o unico jeito confiavel de
// saber que o middleware terminou antes de checar o resultado.
function executar(req: Request, ...papeisPermitidos: PapelMembro[]): Promise<unknown> {
  return new Promise((resolve) => {
    autorizarCompartilhada(...papeisPermitidos)(req, {} as Response, (erro?: unknown) => {
      resolve(erro);
    });
  });
}

describe('autorizarCompartilhada (02-ARCHITECTURE.md §8.3 nivel 2)', () => {
  beforeEach(() => {
    buscarMeuMembroAtivoMock.mockReset();
  });

  it('RN-51: nao membro (buscarMeuMembroAtivo retorna null) responde NaoEncontradoErro, nunca 403', async () => {
    buscarMeuMembroAtivoMock.mockResolvedValue(null);
    const req = fabricarRequisicao('usuario-1', 'grupo-1');

    const erro = await executar(req);

    expect(erro).toBeInstanceOf(NaoEncontradoErro);
    expect(buscarMeuMembroAtivoMock).toHaveBeenCalledWith('grupo-1', 'usuario-1');
  });

  it.each<PapelMembro>(['ADMINISTRADOR', 'PARTICIPANTE', 'OBSERVADOR'])(
    'sem papeisPermitidos, qualquer membro ativo (%s) passa e popula req.membro',
    async (papel) => {
      const membro = fabricarMembro(papel);
      buscarMeuMembroAtivoMock.mockResolvedValue(membro);
      const req = fabricarRequisicao('usuario-1', 'grupo-1');

      const erro = await executar(req);

      expect(erro).toBeUndefined();
      expect(req.membro).toEqual(membro);
    },
  );

  it('ADMINISTRADOR autorizado quando a acao exige ADMINISTRADOR', async () => {
    buscarMeuMembroAtivoMock.mockResolvedValue(fabricarMembro('ADMINISTRADOR'));
    const req = fabricarRequisicao('usuario-1', 'grupo-1');

    const erro = await executar(req, 'ADMINISTRADOR');

    expect(erro).toBeUndefined();
    expect(req.membro.papel).toBe('ADMINISTRADOR');
  });

  it.each<PapelMembro>(['PARTICIPANTE', 'OBSERVADOR'])(
    '%s recebe PapelInsuficienteErro quando a acao exige ADMINISTRADOR (nao apenas prova que o admin consegue)',
    async (papel) => {
      buscarMeuMembroAtivoMock.mockResolvedValue(fabricarMembro(papel));
      const req = fabricarRequisicao('usuario-1', 'grupo-1');

      const erro = await executar(req, 'ADMINISTRADOR');

      expect(erro).toBeInstanceOf(PapelInsuficienteErro);
    },
  );

  it('OBSERVADOR recebe PapelInsuficienteErro em qualquer acao restrita a ADMINISTRADOR ou PARTICIPANTE', async () => {
    buscarMeuMembroAtivoMock.mockResolvedValue(fabricarMembro('OBSERVADOR'));
    const req = fabricarRequisicao('usuario-1', 'grupo-1');

    const erro = await executar(req, 'ADMINISTRADOR', 'PARTICIPANTE');

    expect(erro).toBeInstanceOf(PapelInsuficienteErro);
  });

  it('PARTICIPANTE e autorizado quando a acao permite ADMINISTRADOR ou PARTICIPANTE', async () => {
    buscarMeuMembroAtivoMock.mockResolvedValue(fabricarMembro('PARTICIPANTE'));
    const req = fabricarRequisicao('usuario-1', 'grupo-1');

    const erro = await executar(req, 'ADMINISTRADOR', 'PARTICIPANTE');

    expect(erro).toBeUndefined();
  });

  it('membro REMOVIDO nunca chega ao middleware como ativo (buscarMeuMembroAtivo ja filtra situacao=ATIVO)', async () => {
    // O filtro por situacao vive no repositorio (buscarAtivo), consumido
    // pelo servico — aqui so confirmamos que "nenhum membro ativo" (o caso
    // real de um REMOVIDO/SAIU) sempre cai em 404, nunca em 403.
    buscarMeuMembroAtivoMock.mockResolvedValue(null);
    const req = fabricarRequisicao('usuario-1', 'grupo-1');

    const erro = await executar(req, 'ADMINISTRADOR');

    expect(erro).toBeInstanceOf(NaoEncontradoErro);
  });
});
