import { describe, expect, it, vi } from 'vitest';
import { ErroApi } from '@/servicos/erro-api';
import { aplicarErrosDeCampo } from './aplicar-erros-campo';

describe('aplicarErrosDeCampo', () => {
  it('chama setError para cada item de erro.errors', () => {
    const setError = vi.fn();
    const erro = new ErroApi('Dados inválidos.', 'VALIDACAO', 422, [
      { campo: 'valor', mensagem: 'O valor deve ser maior que zero.' },
      { campo: 'categoriaId', mensagem: 'Categoria incompatível.' },
    ]);

    aplicarErrosDeCampo(erro, setError);

    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith('valor', {
      type: 'server',
      message: 'O valor deve ser maior que zero.',
    });
    expect(setError).toHaveBeenCalledWith('categoriaId', {
      type: 'server',
      message: 'Categoria incompatível.',
    });
  });

  it('não chama setError quando erro.errors está ausente', () => {
    const setError = vi.fn();
    const erro = new ErroApi('Erro genérico.', 'ERRO_DESCONHECIDO');

    aplicarErrosDeCampo(erro, setError);

    expect(setError).not.toHaveBeenCalled();
  });
});
