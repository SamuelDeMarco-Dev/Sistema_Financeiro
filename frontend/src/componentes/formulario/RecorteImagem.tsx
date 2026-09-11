import { useEffect, useMemo, useRef, useState } from 'react';
import { Botao } from '@/componentes/ui/Botao';
import {
  calcularEscalaBase,
  calcularRetanguloOrigem,
  centralizar,
  limitarDeslocamento,
} from '@/utilitarios/recorte-imagem';
import type { Deslocamento, Dimensoes } from '@/utilitarios/recorte-imagem';
import type { PointerEvent, ReactElement } from 'react';

interface RecorteImagemProps {
  arquivo: File;
  onConfirmar: (recorte: Blob) => void;
  onCancelar: () => void;
  /** Muda so o texto do botao de confirmacao, para a acao ficar no
   * vocabulario de quem chama ("foto" no perfil, "imagem" no grupo). */
  rotuloConfirmar?: string;
}

const TAMANHO_VISOR_PX = 256;
const TAMANHO_SAIDA_PX = 512;
const ZOOM_MINIMO = 1;
const ZOOM_MAXIMO = 3;
const QUALIDADE_WEBP = 0.9;

/**
 * Ferramenta de recorte simples (arrastar para reposicionar + zoom),
 * sem biblioteca externa — so canvas e pointer events. O backend ja
 * recorta um thumbnail centrado (foto de perfil na issue #17, imagem de
 * grupo na #67), mas ali a decisao de "qual parte da imagem importa" e'
 * automatica; aqui quem escolhe e' o usuario, antes do upload. A
 * matematica do recorte (escala, limites, retangulo de origem) vive em
 * utilitarios/recorte-imagem.ts, testada isoladamente sem depender de
 * canvas/DOM real.
 */
export function RecorteImagem({
  arquivo,
  onConfirmar,
  onCancelar,
  rotuloConfirmar = 'Usar esta imagem',
}: RecorteImagemProps): ReactElement {
  const urlObjeto = useMemo(() => URL.createObjectURL(arquivo), [arquivo]);
  const imagemRef = useRef<HTMLImageElement>(null);
  const [dimensoesNaturais, setDimensoesNaturais] = useState<Dimensoes | null>(null);
  const [zoom, setZoom] = useState(ZOOM_MINIMO);
  const [deslocamento, setDeslocamento] = useState<Deslocamento>({ x: 0, y: 0 });
  const arrastoRef = useRef<{
    inicioPonteiro: Deslocamento;
    inicioDeslocamento: Deslocamento;
  } | null>(null);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(urlObjeto);
    };
  }, [urlObjeto]);

  const escalaBase = dimensoesNaturais
    ? calcularEscalaBase(dimensoesNaturais, TAMANHO_VISOR_PX)
    : 1;
  const escalaTotal = escalaBase * zoom;

  function aoCarregarImagem(): void {
    const imagem = imagemRef.current;
    if (!imagem) return;
    const dimensoes: Dimensoes = { largura: imagem.naturalWidth, altura: imagem.naturalHeight };
    setDimensoesNaturais(dimensoes);
    const escala = calcularEscalaBase(dimensoes, TAMANHO_VISOR_PX);
    setDeslocamento(centralizar(dimensoes, escala, TAMANHO_VISOR_PX));
  }

  function aoMudarZoom(novoZoom: number): void {
    setZoom(novoZoom);
    if (dimensoesNaturais) {
      const escala = escalaBase * novoZoom;
      setDeslocamento((atual) =>
        limitarDeslocamento(atual, dimensoesNaturais, escala, TAMANHO_VISOR_PX),
      );
    }
  }

  function aoIniciarArrasto(evento: PointerEvent<HTMLDivElement>): void {
    arrastoRef.current = {
      inicioPonteiro: { x: evento.clientX, y: evento.clientY },
      inicioDeslocamento: deslocamento,
    };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function aoArrastar(evento: PointerEvent<HTMLDivElement>): void {
    const arrasto = arrastoRef.current;
    if (!arrasto || !dimensoesNaturais) return;
    const deltaX = evento.clientX - arrasto.inicioPonteiro.x;
    const deltaY = evento.clientY - arrasto.inicioPonteiro.y;
    setDeslocamento(
      limitarDeslocamento(
        {
          x: arrasto.inicioDeslocamento.x + deltaX,
          y: arrasto.inicioDeslocamento.y + deltaY,
        },
        dimensoesNaturais,
        escalaTotal,
        TAMANHO_VISOR_PX,
      ),
    );
  }

  function aoSoltarArrasto(): void {
    arrastoRef.current = null;
  }

  function aoConfirmar(): void {
    const imagem = imagemRef.current;
    if (!imagem || !dimensoesNaturais) return;

    const origem = calcularRetanguloOrigem(deslocamento, escalaTotal, TAMANHO_VISOR_PX);

    const canvas = document.createElement('canvas');
    canvas.width = TAMANHO_SAIDA_PX;
    canvas.height = TAMANHO_SAIDA_PX;
    const contexto = canvas.getContext('2d');
    if (!contexto) return;
    contexto.drawImage(
      imagem,
      origem.x,
      origem.y,
      origem.tamanho,
      origem.tamanho,
      0,
      0,
      TAMANHO_SAIDA_PX,
      TAMANHO_SAIDA_PX,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) onConfirmar(blob);
      },
      'image/webp',
      QUALIDADE_WEBP,
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        role="application"
        aria-label="Área de recorte da imagem — arraste para reposicionar"
        onPointerDown={aoIniciarArrasto}
        onPointerMove={aoArrastar}
        onPointerUp={aoSoltarArrasto}
        onPointerLeave={aoSoltarArrasto}
        className="relative overflow-hidden rounded-full border border-borda bg-borda"
        style={{ width: TAMANHO_VISOR_PX, height: TAMANHO_VISOR_PX, touchAction: 'none' }}
      >
        <img
          ref={imagemRef}
          src={urlObjeto}
          alt=""
          draggable={false}
          onLoad={aoCarregarImagem}
          className="absolute select-none"
          style={{
            left: deslocamento.x,
            top: deslocamento.y,
            width: dimensoesNaturais ? dimensoesNaturais.largura * escalaTotal : undefined,
            height: dimensoesNaturais ? dimensoesNaturais.altura * escalaTotal : undefined,
          }}
        />
      </div>

      <label className="flex w-full max-w-xs flex-col gap-1 text-sm text-textoSuave">
        Zoom
        <input
          type="range"
          min={ZOOM_MINIMO}
          max={ZOOM_MAXIMO}
          step={0.01}
          value={zoom}
          onChange={(evento) => {
            aoMudarZoom(Number(evento.target.value));
          }}
        />
      </label>

      <div className="flex gap-2">
        <Botao variante="secundaria" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao onClick={aoConfirmar} disabled={!dimensoesNaturais}>
          {rotuloConfirmar}
        </Botao>
      </div>
    </div>
  );
}
