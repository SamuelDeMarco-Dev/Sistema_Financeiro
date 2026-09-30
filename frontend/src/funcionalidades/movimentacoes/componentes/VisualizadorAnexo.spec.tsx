import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualizadorAnexo } from './VisualizadorAnexo';
import * as anexoServico from '../servicos/anexo.servico';
import type { AnexoResumo } from '../tipos/movimentacao';

vi.mock('../servicos/anexo.servico');

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
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
});

describe('VisualizadorAnexo', () => {
  it('não renderiza nada quando anexo é null', () => {
    render(<VisualizadorAnexo anexo={null} aoFechar={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('mostra a imagem inline para anexo do tipo image/*', async () => {
    vi.mocked(anexoServico.baixarConteudoAnexo).mockResolvedValue(new Blob(['x']));
    const anexo = fabricarAnexo({ tipoMime: 'image/png', nomeOriginal: 'nota.png' });
    render(<VisualizadorAnexo anexo={anexo} aoFechar={vi.fn()} />);

    expect(screen.getByText('nota.png')).toBeTruthy();
    const imagem = await screen.findByRole('img', { name: 'nota.png' });
    expect(imagem.getAttribute('src')).toBe('blob:mock-url');
  });

  it('mostra um iframe para anexo do tipo application/pdf', async () => {
    vi.mocked(anexoServico.baixarConteudoAnexo).mockResolvedValue(new Blob(['x']));
    const anexo = fabricarAnexo();
    render(<VisualizadorAnexo anexo={anexo} aoFechar={vi.fn()} />);

    await waitFor(() => {
      const iframe = document.querySelector('iframe');
      expect(iframe?.getAttribute('src')).toBe('blob:mock-url');
      expect(iframe?.getAttribute('title')).toBe('comprovante.pdf');
    });
  });

  it('mostra mensagem de erro quando o download do conteúdo falha', async () => {
    vi.mocked(anexoServico.baixarConteudoAnexo).mockRejectedValue(new Error('falhou'));
    render(<VisualizadorAnexo anexo={fabricarAnexo()} aoFechar={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Não foi possível carregar o anexo.',
    );
  });
});
