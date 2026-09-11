import { describe, expect, it } from 'vitest';
import {
  calcularEscalaBase,
  calcularRetanguloOrigem,
  centralizar,
  clamp,
  limitarDeslocamento,
} from './recorte-imagem';

describe('clamp', () => {
  it('mantem o valor quando ja esta dentro dos limites', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('corta para o minimo quando abaixo', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('corta para o maximo quando acima', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('calcularEscalaBase', () => {
  it('escala pela dimensao menor, cobrindo o visor inteiro (cover)', () => {
    // imagem retangular 400x200 num visor 256x256: a menor dimensao (200)
    // precisa esticar ate 256 para cobrir o quadrado.
    const escala = calcularEscalaBase({ largura: 400, altura: 200 }, 256);
    expect(escala).toBeCloseTo(256 / 200);
  });

  it('imagem quadrada usa a mesma escala em qualquer dimensao', () => {
    const escala = calcularEscalaBase({ largura: 300, altura: 300 }, 256);
    expect(escala).toBeCloseTo(256 / 300);
  });
});

describe('centralizar', () => {
  it('centraliza uma imagem maior que o visor apos escalar (deslocamento negativo)', () => {
    // 400x200 escalada por 256/200=1.28 -> 512x256; sobra 512-256=256,
    // metade de cada lado fica fora (-128).
    const deslocamento = centralizar({ largura: 400, altura: 200 }, 256 / 200, 256);
    expect(deslocamento.x).toBeCloseTo(-128);
    expect(deslocamento.y).toBeCloseTo(0);
  });
});

describe('limitarDeslocamento', () => {
  const dimensoes = { largura: 400, altura: 200 };
  const escala = 256 / 200; // cobre o visor 256x256 -> imagem vira 512x256

  it('nao deixa a borda esquerda/superior passar de 0 (sem fundo vazio)', () => {
    const resultado = limitarDeslocamento({ x: 50, y: 50 }, dimensoes, escala, 256);
    expect(resultado.x).toBe(0);
    expect(resultado.y).toBe(0);
  });

  it('nao deixa a imagem descolar da borda direita/inferior do visor', () => {
    // largura escalada = 512, visor = 256 -> minimo x = 256-512 = -256
    const resultado = limitarDeslocamento({ x: -1000, y: -1000 }, dimensoes, escala, 256);
    expect(resultado.x).toBe(256 - 512);
    // altura escalada = 256 (igual ao visor) -> so ha uma posicao possivel, 0
    expect(resultado.y).toBe(0);
  });

  it('aceita um deslocamento valido dentro dos limites sem alterar', () => {
    const resultado = limitarDeslocamento({ x: -100, y: 0 }, dimensoes, escala, 256);
    expect(resultado).toEqual({ x: -100, y: 0 });
  });
});

describe('calcularRetanguloOrigem', () => {
  it('centro do visor (deslocamento 0) com escala 1 mapeia para a origem 0,0', () => {
    const origem = calcularRetanguloOrigem({ x: 0, y: 0 }, 1, 256);
    // toBeCloseTo (nao toEqual/toBe): a negacao de 0 produz -0, que e'
    // numericamente igual a 0 mas falha igualdade estrita (Object.is).
    expect(origem.x).toBeCloseTo(0);
    expect(origem.y).toBeCloseTo(0);
    expect(origem.tamanho).toBe(256);
  });

  it('deslocamento negativo (imagem arrastada para a esquerda) desloca a origem para a direita', () => {
    const origem = calcularRetanguloOrigem({ x: -128, y: 0 }, 2, 256);
    expect(origem.x).toBeCloseTo(64); // 128/2
    expect(origem.y).toBeCloseTo(0);
    expect(origem.tamanho).toBeCloseTo(128); // 256/2
  });

  it('zoom maior reduz o tamanho da regiao de origem recortada', () => {
    const origemZoom1 = calcularRetanguloOrigem({ x: 0, y: 0 }, 1, 256);
    const origemZoom2 = calcularRetanguloOrigem({ x: 0, y: 0 }, 2, 256);
    expect(origemZoom2.tamanho).toBeLessThan(origemZoom1.tamanho);
  });
});
