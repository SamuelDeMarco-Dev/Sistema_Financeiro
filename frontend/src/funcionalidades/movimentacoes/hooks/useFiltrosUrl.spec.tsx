import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useFiltrosUrl } from './useFiltrosUrl';
import type { ReactElement, ReactNode } from 'react';

function envolverCom(rotaInicial: string) {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <MemoryRouter initialEntries={[rotaInicial]}>{children}</MemoryRouter>;
  };
}

describe('useFiltrosUrl', () => {
  it('parte de filtros vazios quando a URL nao tem parametros', () => {
    const { result } = renderHook(() => useFiltrosUrl(), {
      wrapper: envolverCom('/movimentacoes'),
    });

    expect(result.current.filtros).toEqual({
      dataInicio: null,
      dataFim: null,
      tipo: [],
      situacao: [],
      contaId: [],
      categoriaId: [],
      etiquetaId: [],
      busca: '',
      pagina: 1,
    });
  });

  it('le listas, datas, busca e pagina da URL (RF-34: recarregar preserva os filtros)', () => {
    const { result } = renderHook(() => useFiltrosUrl(), {
      wrapper: envolverCom(
        '/movimentacoes?tipo=RECEITA,DESPESA&situacao=PAGA&contaId=c1,c2&busca=mercado&dataInicio=2026-08-01&dataFim=2026-08-31&pagina=3',
      ),
    });

    expect(result.current.filtros).toMatchObject({
      tipo: ['RECEITA', 'DESPESA'],
      situacao: ['PAGA'],
      contaId: ['c1', 'c2'],
      busca: 'mercado',
      dataInicio: '2026-08-01',
      dataFim: '2026-08-31',
      pagina: 3,
    });
  });

  it('ignora valores de enum invalidos na URL, sem quebrar', () => {
    const { result } = renderHook(() => useFiltrosUrl(), {
      wrapper: envolverCom('/movimentacoes?tipo=RECEITA,INVALIDO'),
    });

    expect(result.current.filtros.tipo).toEqual(['RECEITA']);
  });

  it('alterar um filtro (que nao seja a propria pagina) volta para a pagina 1', () => {
    const { result } = renderHook(() => useFiltrosUrl(), {
      wrapper: envolverCom('/movimentacoes?pagina=5'),
    });
    expect(result.current.filtros.pagina).toBe(5);

    act(() => {
      result.current.definirFiltros({ busca: 'aluguel' });
    });

    expect(result.current.filtros.busca).toBe('aluguel');
    expect(result.current.filtros.pagina).toBe(1);
  });

  it('mudar so a pagina preserva o valor informado', () => {
    const { result } = renderHook(() => useFiltrosUrl(), {
      wrapper: envolverCom('/movimentacoes?busca=aluguel'),
    });

    act(() => {
      result.current.definirFiltros({ pagina: 4 });
    });

    expect(result.current.filtros.pagina).toBe(4);
    expect(result.current.filtros.busca).toBe('aluguel');
  });

  it('limparTodos remove todos os filtros da URL', () => {
    const { result } = renderHook(() => useFiltrosUrl(), {
      wrapper: envolverCom('/movimentacoes?tipo=RECEITA&busca=aluguel&pagina=3'),
    });

    act(() => {
      result.current.limparTodos();
    });

    expect(result.current.filtros).toEqual({
      dataInicio: null,
      dataFim: null,
      tipo: [],
      situacao: [],
      contaId: [],
      categoriaId: [],
      etiquetaId: [],
      busca: '',
      pagina: 1,
    });
  });
});
