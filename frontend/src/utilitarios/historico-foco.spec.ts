import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { limparHistoricoDeFoco, ultimoFocoFora } from './historico-foco';

function criarBotao(rotulo: string): HTMLButtonElement {
  const botao = document.createElement('button');
  botao.textContent = rotulo;
  document.body.append(botao);
  return botao;
}

beforeEach(() => {
  limparHistoricoDeFoco();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('historico-foco', () => {
  it('sem foco nenhum registrado, nao aponta destino', () => {
    expect(ultimoFocoFora(null)).toBeNull();
  });

  it('devolve o ultimo elemento focado', () => {
    const primeiro = criarBotao('primeiro');
    const segundo = criarBotao('segundo');

    primeiro.focus();
    segundo.focus();

    expect(ultimoFocoFora(null)).toBe(segundo);
  });

  // O caso "menu de acoes -> dialogo": o item de menu sai do DOM junto com o
  // menu, e o destino honesto passa a ser o elemento focado antes dele.
  it('recua para o anterior quando o mais recente saiu do documento', () => {
    const gatilho = criarBotao('gatilho');
    const efemero = criarBotao('item de menu');

    gatilho.focus();
    efemero.focus();
    efemero.remove();

    expect(ultimoFocoFora(null)).toBe(gatilho);
  });

  it('ignora elementos dentro do container informado', () => {
    const fora = criarBotao('fora');
    const caixa = document.createElement('div');
    document.body.append(caixa);
    const dentro = document.createElement('button');
    caixa.append(dentro);

    fora.focus();
    dentro.focus();

    expect(ultimoFocoFora(caixa)).toBe(fora);
  });

  it('nao registra o body como destino', () => {
    const botao = criarBotao('unico');
    botao.focus();
    botao.blur();

    expect(ultimoFocoFora(null)).toBe(botao);
  });
});
