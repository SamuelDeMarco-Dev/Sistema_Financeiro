import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecorteAvatar } from './RecorteAvatar';

function fabricarArquivo(): File {
  return new File(['conteudo-fake'], 'foto.png', { type: 'image/png' });
}

describe('RecorteAvatar', () => {
  beforeEach(() => {
    // jsdom nao implementa URL.createObjectURL/canvas 2d de verdade — sem
    // isto o componente lanca "not implemented" ao montar/confirmar.
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['recorte-fake'], { type: 'image/webp' }));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderizarECarregarImagem(): void {
    render(
      <RecorteAvatar arquivo={fabricarArquivo()} onConfirmar={vi.fn()} onCancelar={vi.fn()} />,
    );
    const imagem = document.querySelector('img');
    if (!imagem) throw new Error('imagem nao encontrada');
    Object.defineProperty(imagem, 'naturalWidth', { value: 400, configurable: true });
    Object.defineProperty(imagem, 'naturalHeight', { value: 200, configurable: true });
    fireEvent.load(imagem);
  }

  it('chama onCancelar ao clicar em Cancelar', () => {
    const onCancelar = vi.fn();
    render(
      <RecorteAvatar arquivo={fabricarArquivo()} onConfirmar={vi.fn()} onCancelar={onCancelar} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('desabilita "Usar esta foto" ate a imagem carregar', () => {
    render(
      <RecorteAvatar arquivo={fabricarArquivo()} onConfirmar={vi.fn()} onCancelar={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Usar esta foto' })).toHaveProperty('disabled', true);
  });

  it('habilita "Usar esta foto" apos a imagem carregar e chama onConfirmar com um Blob ao confirmar', () => {
    const onConfirmar = vi.fn();
    render(
      <RecorteAvatar arquivo={fabricarArquivo()} onConfirmar={onConfirmar} onCancelar={vi.fn()} />,
    );
    const imagem = document.querySelector('img');
    if (!imagem) throw new Error('imagem nao encontrada');
    Object.defineProperty(imagem, 'naturalWidth', { value: 400, configurable: true });
    Object.defineProperty(imagem, 'naturalHeight', { value: 200, configurable: true });
    fireEvent.load(imagem);

    const botaoConfirmar = screen.getByRole('button', { name: 'Usar esta foto' });
    expect(botaoConfirmar).toHaveProperty('disabled', false);

    fireEvent.click(botaoConfirmar);

    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onConfirmar.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
  });

  it('o controle de zoom vai de 1 a 3 e comeca em 1 (sem ampliacao)', () => {
    renderizarECarregarImagem();

    const controleZoom = screen.getByLabelText<HTMLInputElement>('Zoom');
    expect(controleZoom.min).toBe('1');
    expect(controleZoom.max).toBe('3');
    expect(controleZoom.value).toBe('1');

    fireEvent.change(controleZoom, { target: { value: '2' } });
    expect(controleZoom.value).toBe('2');
  });

  it('arrastar reposiciona a imagem dentro do visor', () => {
    // jsdom nao implementa o construtor PointerEvent (clientX/clientY nao
    // chegam no handler via fireEvent.pointerDown/Move) — MouseEvent com o
    // mesmo `type` funciona porque o listener de React e' por nome de
    // evento nativo, e MouseEvent suporta clientX/clientY de verdade.
    function dispararPonteiro(
      elemento: Element,
      tipo: 'pointerdown' | 'pointermove' | 'pointerup',
      clientX: number,
      clientY: number,
    ): void {
      fireEvent(elemento, new MouseEvent(tipo, { clientX, clientY, bubbles: true }));
    }

    renderizarECarregarImagem();
    const areaDeArrasto = screen.getByRole('application');
    // jsdom nao implementa setPointerCapture.
    Element.prototype.setPointerCapture = vi.fn();
    const imagem = document.querySelector('img');
    if (!imagem) throw new Error('imagem nao encontrada');
    const posicaoInicial = imagem.style.left;

    dispararPonteiro(areaDeArrasto, 'pointerdown', 100, 100);
    dispararPonteiro(areaDeArrasto, 'pointermove', 50, 100);

    expect(imagem.style.left).not.toBe(posicaoInicial);

    dispararPonteiro(areaDeArrasto, 'pointerup', 50, 100);
    const posicaoAposSoltar = imagem.style.left;

    // Depois de soltar, mover o ponteiro sem novo pointerDown nao mexe mais
    // na imagem (o arrasto realmente terminou).
    dispararPonteiro(areaDeArrasto, 'pointermove', 10, 10);
    expect(imagem.style.left).toBe(posicaoAposSoltar);
  });
});
