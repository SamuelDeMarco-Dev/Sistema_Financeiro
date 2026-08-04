import { mkdir, unlink } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { NaoEncontradoErro, TipoArquivoInvalidoErro } from '@/erros';
import { PerfilRepositorio } from '@/repositorios/perfil.repositorio';
import { type UsuarioComPerfil, UsuarioRepositorio } from '@/repositorios/usuario.repositorio';
import { PerfilServico } from '@/servicos/perfil.servico';
import type { Perfil } from '@prisma/client';

const { toFileMock, fileTypeFromBufferMock } = vi.hoisted(() => ({
  toFileMock: vi.fn().mockResolvedValue(undefined),
  fileTypeFromBufferMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({ mkdir: vi.fn(), unlink: vi.fn() }));
vi.mock('file-type', () => ({ fileTypeFromBuffer: fileTypeFromBufferMock }));
// Sem isto, atualizar() chamaria o prisma.$transaction REAL (precisaria de
// banco) so para invocar callbacks cujo corpo ja e 100% mockado por fora.
vi.mock('@/banco/transacao', () => ({
  executarTransacao: vi.fn((fn: (tx: undefined) => Promise<unknown>) => fn(undefined)),
}));
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    webp: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    toFile: toFileMock,
  })),
}));

function fabricarPerfil(sobrescritas: Partial<Perfil> = {}): Perfil {
  return {
    id: 'perfil-1',
    usuarioId: 'usuario-1',
    fotoUrl: null,
    moedaPadrao: 'BRL',
    idioma: 'pt-BR',
    tema: 'SISTEMA',
    timezone: 'America/Sao_Paulo',
    formatoData: 'dd/MM/yyyy',
    primeiroDiaSemana: 0,
    notificacoesApp: true,
    notificacoesEmail: true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...sobrescritas,
  };
}

function fabricarUsuario(sobrescritas: Partial<UsuarioComPerfil> = {}): UsuarioComPerfil {
  return {
    id: 'usuario-1',
    nome: 'Samuel De Marco',
    email: 'samuel@exemplo.com',
    senhaHash: 'hash-fake',
    emailVerificadoEm: new Date(),
    tokenVerificacao: null,
    tokenVerificacaoExpiraEm: null,
    tokenRecuperacao: null,
    tokenRecuperacaoExpiraEm: null,
    tentativasLogin: 0,
    bloqueadoAte: null,
    ultimoLoginEm: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    excluidoEm: null,
    anonimizadoEm: null,
    perfil: fabricarPerfil(),
    ...sobrescritas,
  };
}

describe('PerfilServico', () => {
  let servico: PerfilServico;
  let perfilRepositorio: MockProxy<PerfilRepositorio>;
  let usuarioRepositorio: MockProxy<UsuarioRepositorio>;

  beforeEach(() => {
    perfilRepositorio = mock();
    usuarioRepositorio = mock();
    servico = new PerfilServico(perfilRepositorio, usuarioRepositorio);
    vi.mocked(mkdir).mockReset().mockResolvedValue(undefined);
    vi.mocked(unlink).mockReset().mockResolvedValue(undefined);
    fileTypeFromBufferMock.mockReset();
    toFileMock.mockReset().mockResolvedValue(undefined);
  });

  describe('consultar', () => {
    it('devolve o perfil combinado (usuario + perfil)', async () => {
      usuarioRepositorio.buscarPorId.mockResolvedValue(fabricarUsuario());

      const resultado = await servico.consultar('usuario-1');

      expect(resultado).toMatchObject({
        id: 'usuario-1',
        nome: 'Samuel De Marco',
        email: 'samuel@exemplo.com',
        moedaPadrao: 'BRL',
      });
    });

    it('lanca NaoEncontradoErro quando o usuario nao existe', async () => {
      usuarioRepositorio.buscarPorId.mockResolvedValue(null);

      await expect(servico.consultar('usuario-1')).rejects.toThrow(NaoEncontradoErro);
    });
  });

  describe('atualizar', () => {
    it('atualiza so os campos de perfil quando nome nao vem no corpo', async () => {
      usuarioRepositorio.buscarPorId.mockResolvedValue(fabricarUsuario());

      await servico.atualizar('usuario-1', { tema: 'ESCURO' });

      expect(usuarioRepositorio.atualizarNome).not.toHaveBeenCalled();
      expect(perfilRepositorio.atualizar).toHaveBeenCalledWith(
        'usuario-1',
        { tema: 'ESCURO' },
        undefined,
      );
    });

    it('atualiza nome (Usuario) e preferencias (Perfil) juntos', async () => {
      usuarioRepositorio.buscarPorId.mockResolvedValue(fabricarUsuario());

      await servico.atualizar('usuario-1', { nome: 'Novo Nome', tema: 'CLARO' });

      expect(usuarioRepositorio.atualizarNome).toHaveBeenCalledWith(
        'usuario-1',
        'Novo Nome',
        undefined,
      );
      expect(perfilRepositorio.atualizar).toHaveBeenCalledWith(
        'usuario-1',
        { tema: 'CLARO' },
        undefined,
      );
    });

    it('nao chama o repositorio de perfil quando so o nome muda', async () => {
      usuarioRepositorio.buscarPorId.mockResolvedValue(fabricarUsuario());

      await servico.atualizar('usuario-1', { nome: 'Novo Nome' });

      expect(perfilRepositorio.atualizar).not.toHaveBeenCalled();
    });
  });

  describe('atualizarFoto', () => {
    it('converte para webp, gera thumbnail e salva a fotoUrl', async () => {
      fileTypeFromBufferMock.mockResolvedValue({ mime: 'image/png', ext: 'png' });
      perfilRepositorio.definirFoto.mockResolvedValue(fabricarPerfil());

      const fotoUrl = await servico.atualizarFoto('usuario-1', Buffer.from('fake-png'));

      expect(fotoUrl).toContain('usuario-1.webp');
      expect(toFileMock).toHaveBeenCalledTimes(2); // foto + thumbnail
      expect(perfilRepositorio.definirFoto).toHaveBeenCalledWith('usuario-1', fotoUrl);
    });

    it('lanca TipoArquivoInvalidoErro quando o magic number nao e uma imagem aceita', async () => {
      fileTypeFromBufferMock.mockResolvedValue({ mime: 'application/x-msdownload', ext: 'exe' });

      await expect(servico.atualizarFoto('usuario-1', Buffer.from('fake-exe'))).rejects.toThrow(
        TipoArquivoInvalidoErro,
      );
      expect(toFileMock).not.toHaveBeenCalled();
    });

    it('lanca TipoArquivoInvalidoErro quando o file-type nao reconhece o buffer', async () => {
      fileTypeFromBufferMock.mockResolvedValue(undefined);

      await expect(
        servico.atualizarFoto('usuario-1', Buffer.from('sem-assinatura')),
      ).rejects.toThrow(TipoArquivoInvalidoErro);
    });
  });

  describe('removerFoto', () => {
    it('remove os arquivos e limpa fotoUrl mesmo se o arquivo ja nao existir', async () => {
      vi.mocked(unlink).mockRejectedValue(new Error('ENOENT'));
      perfilRepositorio.definirFoto.mockResolvedValue(fabricarPerfil({ fotoUrl: null }));

      await servico.removerFoto('usuario-1');

      expect(perfilRepositorio.definirFoto).toHaveBeenCalledWith('usuario-1', null);
    });
  });
});
