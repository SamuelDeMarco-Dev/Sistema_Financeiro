import { describe, expect, it } from 'vitest';
import { ErroApi } from '@/servicos/erro-api';
import { mensagemErroConvite, mensagemErroMembro } from './mensagens-erro-grupo';

function erro(codigo: string, mensagem = 'Mensagem do servidor.'): ErroApi {
  return new ErroApi(mensagem, codigo, 409);
}

describe('mensagemErroConvite', () => {
  it('CONVITE_DUPLICADO aponta o cancelamento do convite anterior (RN-36)', () => {
    const mensagem = mensagemErroConvite(erro('CONVITE_DUPLICADO'));

    expect(mensagem).toContain('convite pendente');
    expect(mensagem).toContain('Cancele');
  });

  it('JA_E_MEMBRO manda alterar o papel em vez de convidar (RN-38)', () => {
    const mensagem = mensagemErroConvite(erro('JA_E_MEMBRO'));

    expect(mensagem).toContain('já faz parte do grupo');
    expect(mensagem).toContain('papel');
  });

  it('nao repete a mensagem generica de "muitas tentativas" para convites', () => {
    expect(mensagemErroConvite(erro('LIMITE_EXCEDIDO'))).toContain('convites');
  });

  it('codigo desconhecido cai na mensagem do servidor', () => {
    expect(mensagemErroConvite(erro('QUALQUER_OUTRO', 'Deu ruim.'))).toBe('Deu ruim.');
  });
});

describe('mensagemErroMembro', () => {
  it('ADMINISTRADOR_UNICO ao sair manda transferir primeiro (RN-29)', () => {
    const mensagem = mensagemErroMembro(erro('ADMINISTRADOR_UNICO'), 'sair');

    expect(mensagem).toContain('Transfira a administração');
  });

  it('ADMINISTRADOR_UNICO ao remover explica que quem transfere e o proprio administrador', () => {
    const mensagem = mensagemErroMembro(erro('ADMINISTRADOR_UNICO'), 'remover');

    expect(mensagem).toContain('não pode ser removido');
    // Nao pode sugerir que quem esta removendo consiga transferir por ele.
    expect(mensagem).not.toContain('Transfira a administração');
  });

  it('ADMINISTRADOR_UNICO ao alterar papel aponta a rota correta (04-API.md §16.5)', () => {
    expect(mensagemErroMembro(erro('ADMINISTRADOR_UNICO'), 'alterar-papel')).toContain(
      'Transferir administração',
    );
  });

  it('demais codigos preservam a mensagem do servidor', () => {
    expect(mensagemErroMembro(erro('REGRA_NEGOCIO', 'Nao pode.'), 'remover')).toBe('Nao pode.');
  });
});
