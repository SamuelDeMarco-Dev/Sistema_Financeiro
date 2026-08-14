import { describe, expect, it } from 'vitest';
import { grupoSchema } from './conta-compartilhada.schema';

function dadosValidos(sobrescritas: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    nome: 'Casa',
    descricao: 'Despesas da casa',
    moeda: 'BRL',
    cor: '#2563EB',
    permiteParticipanteEditarProprias: true,
    criarCategoriasPadrao: true,
    ...sobrescritas,
  };
}

describe('grupoSchema', () => {
  it('aceita os dados minimos e devolve o payload da API', () => {
    const resultado = grupoSchema.safeParse(dadosValidos());

    expect(resultado.success).toBe(true);
    expect(resultado.data).toEqual({
      nome: 'Casa',
      descricao: 'Despesas da casa',
      moeda: 'BRL',
      cor: '#2563EB',
      permiteParticipanteEditarProprias: true,
      criarCategoriasPadrao: true,
    });
  });

  it('rejeita nome com menos de 2 caracteres', () => {
    expect(grupoSchema.safeParse(dadosValidos({ nome: 'A' })).success).toBe(false);
  });

  it('descricao vazia vira undefined, para nao enviar string vazia a API', () => {
    const resultado = grupoSchema.safeParse(dadosValidos({ descricao: '   ' }));

    expect(resultado.success).toBe(true);
    expect(resultado.data?.descricao).toBeUndefined();
  });

  it('normaliza a moeda para maiusculas', () => {
    const resultado = grupoSchema.safeParse(dadosValidos({ moeda: 'usd' }));

    expect(resultado.data?.moeda).toBe('USD');
  });

  it('rejeita moeda que nao tem 3 letras', () => {
    expect(grupoSchema.safeParse(dadosValidos({ moeda: 'REAL' })).success).toBe(false);
    expect(grupoSchema.safeParse(dadosValidos({ moeda: 'BR' })).success).toBe(false);
  });

  it('rejeita cor fora do formato hex de 6 digitos', () => {
    expect(grupoSchema.safeParse(dadosValidos({ cor: 'azul' })).success).toBe(false);
    expect(grupoSchema.safeParse(dadosValidos({ cor: '#25F' })).success).toBe(false);
  });

  it('rejeita descricao acima de 500 caracteres', () => {
    expect(grupoSchema.safeParse(dadosValidos({ descricao: 'x'.repeat(501) })).success).toBe(false);
  });
});
