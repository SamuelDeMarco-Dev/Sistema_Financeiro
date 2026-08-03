import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { EmailJaCadastradoErro } from '@/erros';
import { UsuarioRepositorio } from '@/repositorios/usuario.repositorio';
import { AutenticacaoServico } from '@/servicos/autenticacao.servico';
import { enviarEmail } from '@/utilitarios/email/enviador';
import type { Usuario } from '@prisma/client';

vi.mock('@/utilitarios/email/enviador');

const enviarEmailMockado = vi.mocked(enviarEmail);

function fabricarUsuario(sobrescritas: Partial<Usuario> = {}): Usuario {
  return {
    id: 'usuario-1',
    nome: 'Samuel De Marco',
    email: 'samuel@exemplo.com',
    senhaHash: 'hash-fake',
    emailVerificadoEm: null,
    tokenVerificacao: 'token-fake',
    tokenVerificacaoExpiraEm: new Date(),
    tokenRecuperacao: null,
    tokenRecuperacaoExpiraEm: null,
    tentativasLogin: 0,
    bloqueadoAte: null,
    ultimoLoginEm: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    excluidoEm: null,
    anonimizadoEm: null,
    ...sobrescritas,
  };
}

describe('AutenticacaoServico.cadastrar', () => {
  let servico: AutenticacaoServico;
  let repositorio: MockProxy<UsuarioRepositorio>;

  beforeEach(() => {
    repositorio = mock();
    servico = new AutenticacaoServico(repositorio);
    enviarEmailMockado.mockReset().mockResolvedValue(undefined);
  });

  const dadosCadastro = {
    nome: 'Samuel De Marco',
    email: 'Samuel@Exemplo.com',
    senha: 'SenhaForte@2026',
    confirmacaoSenha: 'SenhaForte@2026',
  };

  it('cria o usuario com e-mail normalizado para minusculas', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(null);
    repositorio.criar.mockResolvedValue(fabricarUsuario({ email: 'samuel@exemplo.com' }));

    await servico.cadastrar(dadosCadastro);

    expect(repositorio.buscarPorEmail).toHaveBeenCalledWith('samuel@exemplo.com');
    expect(repositorio.criar).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'samuel@exemplo.com' }),
    );
  });

  it('lanca EmailJaCadastradoErro quando o e-mail ja existe (RN duplicidade)', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(fabricarUsuario());

    await expect(servico.cadastrar(dadosCadastro)).rejects.toThrow(EmailJaCadastradoErro);
    expect(repositorio.criar).not.toHaveBeenCalled();
  });

  it('envia o e-mail de verificacao com o mesmo token persistido para o usuario', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(null);
    repositorio.criar.mockResolvedValue(fabricarUsuario());

    await servico.cadastrar(dadosCadastro);

    expect(repositorio.criar).toHaveBeenCalledOnce();
    const [dadosCriar] = repositorio.criar.mock.calls[0] as [{ tokenVerificacao: string }];

    expect(enviarEmailMockado).toHaveBeenCalledOnce();
    const [chamada] = enviarEmailMockado.mock.calls[0] as [{ para: string; html: string }];
    expect(chamada.para).toBe('samuel@exemplo.com');
    expect(chamada.html).toContain(dadosCriar.tokenVerificacao);
  });

  it('nao aguarda o envio do e-mail para responder (fire-and-forget)', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(null);
    repositorio.criar.mockResolvedValue(fabricarUsuario());
    // Nunca resolve: se o servico esperasse por isso, o teste travaria ate o timeout.
    enviarEmailMockado.mockReturnValue(new Promise(() => undefined));

    await expect(servico.cadastrar(dadosCadastro)).resolves.toMatchObject({ id: 'usuario-1' });
  });
});
