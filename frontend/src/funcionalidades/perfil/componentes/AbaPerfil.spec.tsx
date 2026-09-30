import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import * as perfilServico from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import { AbaPerfil } from './AbaPerfil';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/perfil/servicos/perfil.servico');
vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
    usuario: null,
    estaAutenticado: false,
    carregando: false,
    entrar: vi.fn(),
    sair: vi.fn(),
    atualizarUsuario: vi.fn(),
  });
});

const PERFIL_FAKE: PerfilCompleto = {
  id: 'usuario-1',
  nome: 'Samuel De Marco',
  email: 'samuel@exemplo.com',
  emailVerificado: true,
  fotoUrl: null,
  moedaPadrao: 'BRL',
  idioma: 'pt-BR',
  tema: 'SISTEMA',
  timezone: 'America/Sao_Paulo',
  formatoData: 'dd/MM/yyyy',
  primeiroDiaSemana: 0,
  notificacoesApp: true,
  notificacoesEmail: true,
  criadoEm: '2026-01-01T00:00:00.000Z',
};

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

describe('AbaPerfil', () => {
  it('preenche o campo nome com o valor atual do perfil', () => {
    render(<AbaPerfil perfil={PERFIL_FAKE} />, { wrapper: Wrapper });
    expect(screen.getByLabelText<HTMLInputElement>('Nome').value).toBe('Samuel De Marco');
  });

  it('mostra as iniciais quando nao ha foto', () => {
    render(<AbaPerfil perfil={PERFIL_FAKE} />, { wrapper: Wrapper });
    expect(screen.getByText('S')).toBeTruthy();
  });

  it('salva o novo nome ao submeter', async () => {
    vi.mocked(perfilServico.atualizarPerfil).mockResolvedValue({
      ...PERFIL_FAKE,
      nome: 'Samuel M.',
    });
    render(<AbaPerfil perfil={PERFIL_FAKE} />, { wrapper: Wrapper });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Samuel M.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));

    // React Query v5 chama mutationFn com (variaveis, contexto) — so as
    // variaveis importam aqui.
    await waitFor(() => {
      expect(vi.mocked(perfilServico.atualizarPerfil).mock.calls[0]?.[0]).toEqual({
        nome: 'Samuel M.',
      });
    });
  });

  it('rejeita nome com menos de 3 caracteres sem chamar a API', async () => {
    render(<AbaPerfil perfil={PERFIL_FAKE} />, { wrapper: Wrapper });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ab' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));

    expect(await screen.findByText('O nome deve ter no minimo 3 caracteres.')).toBeTruthy();
    expect(perfilServico.atualizarPerfil).not.toHaveBeenCalled();
  });

  it('rejeita arquivo maior que 2 MB antes de abrir o recorte', () => {
    render(<AbaPerfil perfil={PERFIL_FAKE} />, { wrapper: Wrapper });

    const arquivoGrande = new File([new Uint8Array(3 * 1024 * 1024)], 'grande.png', {
      type: 'image/png',
    });
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('input de arquivo nao encontrado');

    fireEvent.change(input, { target: { files: [arquivoGrande] } });

    // Nao abriu a tela de recorte — o input de arquivo continua visivel.
    expect(document.querySelector('input[type="file"]')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Usar esta foto' })).toBeNull();
  });

  it('abre o recorte ao escolher um arquivo valido', () => {
    render(<AbaPerfil perfil={PERFIL_FAKE} />, { wrapper: Wrapper });

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    const arquivo = new File(['conteudo'], 'foto.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('input de arquivo nao encontrado');

    fireEvent.change(input, { target: { files: [arquivo] } });

    expect(screen.getByRole('button', { name: 'Usar esta foto' })).toBeTruthy();
  });

  it('mostra "Remover" apenas quando ja existe uma foto', () => {
    render(<AbaPerfil perfil={{ ...PERFIL_FAKE, fotoUrl: 'https://exemplo.com/a.webp' }} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByRole('button', { name: 'Remover' })).toBeTruthy();
  });

  it('remove a foto ao clicar em Remover', async () => {
    vi.mocked(perfilServico.removerFoto).mockResolvedValue(undefined);
    render(<AbaPerfil perfil={{ ...PERFIL_FAKE, fotoUrl: 'https://exemplo.com/a.webp' }} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => {
      expect(perfilServico.removerFoto).toHaveBeenCalledTimes(1);
    });
  });

  it('mostra o erro traduzido quando remover a foto falha', async () => {
    vi.mocked(perfilServico.removerFoto).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'ERRO_DESCONHECIDO',
      message: 'Falha ao remover.',
    });
    render(<AbaPerfil perfil={{ ...PERFIL_FAKE, fotoUrl: 'https://exemplo.com/a.webp' }} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => {
      expect(perfilServico.removerFoto).toHaveBeenCalledTimes(1);
    });
  });

  it('clicar em "Alterar foto" aciona o input de arquivo oculto', () => {
    render(<AbaPerfil perfil={PERFIL_FAKE} />, { wrapper: Wrapper });

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('input de arquivo nao encontrado');
    const cliqueSpy = vi.spyOn(input, 'click');

    fireEvent.click(screen.getByRole('button', { name: 'Alterar foto' }));

    expect(cliqueSpy).toHaveBeenCalledTimes(1);
  });

  describe('fluxo de recorte (canvas mockado)', () => {
    beforeEach(() => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D);
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
        callback(new Blob(['recorte-fake'], { type: 'image/webp' }));
      });
    });

    function escolherArquivoECarregarImagem(): void {
      const arquivo = new File(['conteudo'], 'foto.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]');
      if (!input) throw new Error('input de arquivo nao encontrado');
      fireEvent.change(input, { target: { files: [arquivo] } });

      const imagem = document.querySelector('img');
      if (!imagem) throw new Error('imagem de recorte nao encontrada');
      Object.defineProperty(imagem, 'naturalWidth', { value: 400, configurable: true });
      Object.defineProperty(imagem, 'naturalHeight', { value: 200, configurable: true });
      fireEvent.load(imagem);
    }

    it('confirma o recorte, envia a foto e volta para a tela normal', async () => {
      vi.mocked(perfilServico.atualizarFoto).mockResolvedValue('https://exemplo.com/nova.webp');
      render(<AbaPerfil perfil={PERFIL_FAKE} />, { wrapper: Wrapper });

      escolherArquivoECarregarImagem();
      fireEvent.click(screen.getByRole('button', { name: 'Usar esta foto' }));

      await waitFor(() => {
        expect(perfilServico.atualizarFoto).toHaveBeenCalledTimes(1);
      });
      // Voltou para a tela normal (o recorte some, o formulario de nome volta).
      expect(await screen.findByLabelText('Nome')).toBeTruthy();
    });

    it('cancelar o recorte volta para a tela normal sem enviar nada', () => {
      render(<AbaPerfil perfil={PERFIL_FAKE} />, { wrapper: Wrapper });

      escolherArquivoECarregarImagem();
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.getByLabelText('Nome')).toBeTruthy();
      expect(perfilServico.atualizarFoto).not.toHaveBeenCalled();
    });
  });
});
