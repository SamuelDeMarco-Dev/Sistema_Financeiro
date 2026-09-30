import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GerenciadorAnexos } from './GerenciadorAnexos';
import * as anexoServico from '../servicos/anexo.servico';
import type { AnexoResumo } from '../tipos/movimentacao';
import type { ReactElement, ReactNode } from 'react';

vi.mock('../servicos/anexo.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function fabricarAnexo(sobrescritas: Partial<AnexoResumo> = {}): AnexoResumo {
  return {
    id: 'anexo-1',
    nomeOriginal: 'comprovante.pdf',
    tipoMime: 'application/pdf',
    tamanhoBytes: 148_523,
    url: '/api/v1/anexos/anexo-1/conteudo',
    criadoEm: '2026-08-05T10:00:00.000Z',
    ...sobrescritas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GerenciadorAnexos', () => {
  it('lista os anexos já existentes da movimentação', () => {
    render(<GerenciadorAnexos movimentacaoId="mov-1" anexosIniciais={[fabricarAnexo()]} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText('comprovante.pdf')).toBeTruthy();
    expect(screen.getByText('Anexos (1/5)')).toBeTruthy();
  });

  it('envia um arquivo selecionado e o adiciona à lista após o sucesso', async () => {
    const usuario = userEvent.setup();
    const novoAnexo = fabricarAnexo({
      id: 'anexo-2',
      nomeOriginal: 'nota.png',
      tipoMime: 'image/png',
    });
    vi.mocked(anexoServico.enviarAnexo).mockResolvedValue(novoAnexo);

    render(<GerenciadorAnexos movimentacaoId="mov-1" anexosIniciais={[]} />, { wrapper: Wrapper });

    const arquivo = new File(['conteudo'], 'nota.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Anexos/, { selector: 'input' });
    await usuario.upload(input, arquivo);

    await waitFor(() => {
      expect(screen.getByText('nota.png')).toBeTruthy();
    });
    expect(anexoServico.enviarAnexo).toHaveBeenCalledWith('mov-1', arquivo, expect.any(Function));
  });

  it('mostra o erro do arquivo e permite descartar sem afetar outros', async () => {
    const usuario = userEvent.setup();
    vi.mocked(anexoServico.enviarAnexo).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'TIPO_ARQUIVO_INVALIDO',
      message: 'Tipo de arquivo não suportado. Envie PDF, JPEG ou PNG.',
    });

    render(<GerenciadorAnexos movimentacaoId="mov-1" anexosIniciais={[]} />, { wrapper: Wrapper });

    const arquivo = new File(['x'], 'nao-e-pdf-de-verdade.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/Anexos/, { selector: 'input' });
    await usuario.upload(input, arquivo);

    expect(
      await screen.findByText('Tipo de arquivo não suportado. Envie PDF, JPEG ou PNG.'),
    ).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Descartar falha de nao-e-pdf-de-verdade.pdf'));
    expect(screen.queryByText('nao-e-pdf-de-verdade.pdf')).toBeNull();
  });

  it('exclui um anexo existente ao clicar em excluir', async () => {
    vi.mocked(anexoServico.excluirAnexo).mockResolvedValue(undefined);
    render(<GerenciadorAnexos movimentacaoId="mov-1" anexosIniciais={[fabricarAnexo()]} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(screen.getByLabelText('Excluir comprovante.pdf'));

    await waitFor(() => {
      expect(screen.queryByText('comprovante.pdf')).toBeNull();
    });
    expect(vi.mocked(anexoServico.excluirAnexo).mock.calls[0]?.[0]).toBe('anexo-1');
  });

  it('esconde a área de envio e avisa quando o limite de 5 é atingido', () => {
    const anexos = Array.from({ length: 5 }, (_, indice) =>
      fabricarAnexo({ id: `anexo-${indice}`, nomeOriginal: `arquivo-${indice}.pdf` }),
    );
    render(<GerenciadorAnexos movimentacaoId="mov-1" anexosIniciais={anexos} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText(/Limite de 5 anexos atingido/)).toBeTruthy();
    expect(screen.queryByText('Arraste arquivos aqui ou clique para selecionar')).toBeNull();
  });
});
