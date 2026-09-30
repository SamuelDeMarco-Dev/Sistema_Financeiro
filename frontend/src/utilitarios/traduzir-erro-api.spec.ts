import { describe, expect, it } from 'vitest';
import { ErroApi } from '@/servicos/erro-api';
import { traduzirErroApi } from './traduzir-erro-api';

describe('traduzirErroApi', () => {
  it.each([
    ['CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.'],
    ['EMAIL_NAO_VERIFICADO', 'Confirme seu e-mail antes de entrar.'],
    ['CONTA_BLOQUEADA', 'Conta temporariamente bloqueada por excesso de tentativas.'],
    ['LIMITE_EXCEDIDO', 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'],
    ['EMAIL_JA_CADASTRADO', 'Este e-mail ja esta cadastrado.'],
  ])('traduz %s para uma mensagem de interface fixa', (codigo, mensagemEsperada) => {
    const erro = new ErroApi('mensagem crua do backend', codigo);
    expect(traduzirErroApi(erro)).toBe(mensagemEsperada);
  });

  it('usa a mensagem do proprio erro quando o codigo nao tem traducao especifica', () => {
    const erro = new ErroApi('Algo especifico aconteceu.', 'CODIGO_DESCONHECIDO');
    expect(traduzirErroApi(erro)).toBe('Algo especifico aconteceu.');
  });
});
