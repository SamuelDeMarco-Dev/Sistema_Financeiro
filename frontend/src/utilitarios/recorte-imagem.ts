export interface Deslocamento {
  x: number;
  y: number;
}

export interface Dimensoes {
  largura: number;
  altura: number;
}

export function clamp(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}

/** Escala que faz a imagem cobrir totalmente um visor quadrado
 * (equivalente a `object-fit: cover`), na dimensao menor da imagem. */
export function calcularEscalaBase(dimensoes: Dimensoes, tamanhoVisor: number): number {
  return tamanhoVisor / Math.min(dimensoes.largura, dimensoes.altura);
}

export function centralizar(
  dimensoes: Dimensoes,
  escala: number,
  tamanhoVisor: number,
): Deslocamento {
  return {
    x: (tamanhoVisor - dimensoes.largura * escala) / 2,
    y: (tamanhoVisor - dimensoes.altura * escala) / 2,
  };
}

/** Garante que a imagem sempre cobre o visor inteiro — o deslocamento nunca
 * deixa aparecer fundo vazio nas bordas. */
export function limitarDeslocamento(
  candidato: Deslocamento,
  dimensoes: Dimensoes,
  escala: number,
  tamanhoVisor: number,
): Deslocamento {
  const largura = dimensoes.largura * escala;
  const altura = dimensoes.altura * escala;
  return {
    x: clamp(candidato.x, tamanhoVisor - largura, 0),
    y: clamp(candidato.y, tamanhoVisor - altura, 0),
  };
}

export interface RetanguloOrigem {
  x: number;
  y: number;
  tamanho: number;
}

/** Converte o estado visual (deslocamento + escala) na regiao da imagem
 * original (em pixels naturais) que deve ser recortada. */
export function calcularRetanguloOrigem(
  deslocamento: Deslocamento,
  escala: number,
  tamanhoVisor: number,
): RetanguloOrigem {
  return {
    x: -deslocamento.x / escala,
    y: -deslocamento.y / escala,
    tamanho: tamanhoVisor / escala,
  };
}
