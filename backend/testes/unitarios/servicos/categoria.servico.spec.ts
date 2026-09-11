import { beforeEach, describe, expect, it } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { NaoEncontradoErro, RecursoEmUsoErro, RegraNegocioErro } from '@/erros';
import { CategoriaRepositorio } from '@/repositorios/categoria.repositorio';
import type { CategoriaComSubcategorias } from '@/repositorios/categoria.repositorio';
import { CategoriaServico } from '@/servicos/categoria.servico';
import type { Categoria, Prisma } from '@prisma/client';

function fabricarCategoria(sobrescritas: Partial<Categoria> = {}): Categoria {
  return {
    id: 'categoria-1',
    usuarioId: 'usuario-1',
    contaCompartilhadaId: null,
    categoriaPaiId: null,
    nome: 'Alimentação',
    tipo: 'DESPESA',
    cor: '#EA580C',
    icone: 'utensils',
    ehPadraoSistema: false,
    ordem: 0,
    criadoEm: new Date('2026-01-01T00:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
    excluidoEm: null,
    ...sobrescritas,
  };
}

describe('CategoriaServico', () => {
  let servico: CategoriaServico;
  let repositorio: MockProxy<CategoriaRepositorio>;

  beforeEach(() => {
    repositorio = mock();
    servico = new CategoriaServico(repositorio);
    repositorio.contarMovimentacoes.mockResolvedValue(0);
    repositorio.contarSubcategorias.mockResolvedValue(0);
  });

  describe('copiarPadraoParaUsuario', () => {
    it('delega ao repositorio', async () => {
      const tx = {} as Prisma.TransactionClient;
      await servico.copiarPadraoParaUsuario('usuario-1', tx);
      expect(repositorio.copiarPadraoParaUsuario).toHaveBeenCalledWith('usuario-1', tx);
    });
  });

  describe('listarArvore', () => {
    it('monta a arvore com subcategorias aninhadas', async () => {
      const raiz: CategoriaComSubcategorias = {
        ...fabricarCategoria(),
        subcategorias: [
          fabricarCategoria({ id: 'sub-1', nome: 'Restaurante', categoriaPaiId: 'categoria-1' }),
        ],
      };
      repositorio.listarRaizesComSubcategorias.mockResolvedValue([raiz]);

      const resultado = await servico.listarArvore('usuario-1', { apenasRaiz: false });

      expect(resultado).toHaveLength(1);
      expect(resultado[0]?.subcategorias).toHaveLength(1);
      expect(resultado[0]?.subcategorias[0]?.nome).toBe('Restaurante');
    });

    it('omite subcategorias quando apenasRaiz e true', async () => {
      const raiz: CategoriaComSubcategorias = {
        ...fabricarCategoria(),
        subcategorias: [fabricarCategoria({ id: 'sub-1' })],
      };
      repositorio.listarRaizesComSubcategorias.mockResolvedValue([raiz]);

      const resultado = await servico.listarArvore('usuario-1', { apenasRaiz: true });

      expect(resultado[0]?.subcategorias).toHaveLength(0);
    });
  });

  describe('buscarPorId', () => {
    it('lanca NaoEncontradoErro para categoria de outro usuario', async () => {
      repositorio.buscarPorId.mockResolvedValue(null);
      await expect(servico.buscarPorId('categoria-alheia', 'usuario-1')).rejects.toThrow(
        NaoEncontradoErro,
      );
    });
  });

  describe('criar', () => {
    it('cria categoria raiz sem validacao de pai', async () => {
      repositorio.criar.mockResolvedValue(fabricarCategoria());

      await servico.criar('usuario-1', {
        nome: 'Alimentação',
        tipo: 'DESPESA',
        cor: '#EA580C',
        icone: 'utensils',
        categoriaPaiId: null,
      });

      expect(repositorio.criar).toHaveBeenCalledWith('usuario-1', {
        nome: 'Alimentação',
        tipo: 'DESPESA',
        cor: '#EA580C',
        icone: 'utensils',
        categoriaPaiId: null,
      });
    });

    it('cria subcategoria valida (mesmo tipo do pai raiz)', async () => {
      repositorio.buscarPorId.mockResolvedValue(fabricarCategoria({ id: 'pai-1' }));
      repositorio.criar.mockResolvedValue(fabricarCategoria({ categoriaPaiId: 'pai-1' }));

      await servico.criar('usuario-1', {
        nome: 'Restaurante',
        tipo: 'DESPESA',
        cor: '#EA580C',
        icone: 'utensils',
        categoriaPaiId: 'pai-1',
      });

      expect(repositorio.criar).toHaveBeenCalledWith(
        'usuario-1',
        expect.objectContaining({ categoriaPaiId: 'pai-1' }),
      );
    });

    it('rejeita subcategoria de subcategoria (profundidade > 1)', async () => {
      repositorio.buscarPorId.mockResolvedValue(
        fabricarCategoria({ id: 'sub-1', categoriaPaiId: 'raiz-1' }),
      );

      await expect(
        servico.criar('usuario-1', {
          nome: 'Neta',
          tipo: 'DESPESA',
          cor: '#EA580C',
          icone: 'utensils',
          categoriaPaiId: 'sub-1',
        }),
      ).rejects.toThrow(RegraNegocioErro);
    });

    it('rejeita subcategoria com tipo diferente do pai', async () => {
      repositorio.buscarPorId.mockResolvedValue(
        fabricarCategoria({ id: 'pai-1', tipo: 'RECEITA' }),
      );

      await expect(
        servico.criar('usuario-1', {
          nome: 'Errada',
          tipo: 'DESPESA',
          cor: '#EA580C',
          icone: 'utensils',
          categoriaPaiId: 'pai-1',
        }),
      ).rejects.toThrow(RegraNegocioErro);
    });

    it('lanca NaoEncontradoErro quando categoriaPaiId nao pertence ao usuario', async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(
        servico.criar('usuario-1', {
          nome: 'Orfa',
          tipo: 'DESPESA',
          cor: '#EA580C',
          icone: 'utensils',
          categoriaPaiId: 'pai-alheio',
        }),
      ).rejects.toThrow(NaoEncontradoErro);
    });
  });

  describe('atualizar', () => {
    it('permite trocar o tipo quando nao ha movimentacoes vinculadas', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarCategoria({ tipo: 'DESPESA' }));
      repositorio.contarMovimentacoes.mockResolvedValue(0);
      repositorio.atualizar.mockResolvedValue(fabricarCategoria({ tipo: 'RECEITA' }));

      const resultado = await servico.atualizar('categoria-1', 'usuario-1', { tipo: 'RECEITA' });

      expect(resultado.tipo).toBe('RECEITA');
    });

    it('rejeita trocar o tipo quando ha movimentacoes vinculadas', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarCategoria({ tipo: 'DESPESA' }));
      repositorio.contarMovimentacoes.mockResolvedValue(5);

      await expect(
        servico.atualizar('categoria-1', 'usuario-1', { tipo: 'RECEITA' }),
      ).rejects.toThrow(RegraNegocioErro);
      expect(repositorio.atualizar).not.toHaveBeenCalled();
    });

    it('permite atualizar outros campos sem o guard de tipo (so 1 chamada de contarMovimentacoes, para o DTO)', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarCategoria());
      repositorio.atualizar.mockResolvedValue(fabricarCategoria({ nome: 'Novo nome' }));

      await servico.atualizar('categoria-1', 'usuario-1', { nome: 'Novo nome' });

      // 1 chamada: monta o DTO de retorno, nao o guard de troca de tipo
      // (que so dispara quando `dados.tipo` vem definido e diferente).
      expect(repositorio.contarMovimentacoes).toHaveBeenCalledTimes(1);
      expect(repositorio.atualizar).toHaveBeenCalledWith('categoria-1', { nome: 'Novo nome' });
    });
  });

  describe('excluir', () => {
    it('exclui logicamente quando nao ha subcategorias nem movimentacoes', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarCategoria());

      await servico.excluir('categoria-1', 'usuario-1');

      expect(repositorio.excluirLogicamente).toHaveBeenCalledWith('categoria-1');
    });

    it('rejeita excluir categoria com subcategorias', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarCategoria());
      repositorio.contarSubcategorias.mockResolvedValue(2);

      await expect(servico.excluir('categoria-1', 'usuario-1')).rejects.toThrow(RegraNegocioErro);
      expect(repositorio.excluirLogicamente).not.toHaveBeenCalled();
    });

    it('rejeita excluir categoria em uso sem recategorizarPara', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarCategoria());
      repositorio.contarMovimentacoes.mockResolvedValue(10);

      await expect(servico.excluir('categoria-1', 'usuario-1')).rejects.toThrow(RecursoEmUsoErro);
      expect(repositorio.excluirLogicamente).not.toHaveBeenCalled();
    });

    it('exclui quando ha movimentacoes e um destino valido e informado', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarCategoria());
      repositorio.buscarPorId.mockResolvedValue(fabricarCategoria({ id: 'categoria-destino' }));
      repositorio.contarMovimentacoes.mockResolvedValue(10);

      await servico.excluir('categoria-1', 'usuario-1', 'categoria-destino');

      expect(repositorio.buscarPorId).toHaveBeenCalledWith('categoria-destino', 'usuario-1');
      expect(repositorio.excluirLogicamente).toHaveBeenCalledWith('categoria-1');
    });

    it('lanca NaoEncontradoErro quando o destino de recategorizacao nao existe', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarCategoria());
      repositorio.contarMovimentacoes.mockResolvedValue(10);
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(
        servico.excluir('categoria-1', 'usuario-1', 'categoria-inexistente'),
      ).rejects.toThrow(NaoEncontradoErro);
      expect(repositorio.excluirLogicamente).not.toHaveBeenCalled();
    });

    it('lanca NaoEncontradoErro para categoria de outro usuario', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(null);
      await expect(servico.excluir('categoria-alheia', 'usuario-1')).rejects.toThrow(
        NaoEncontradoErro,
      );
    });
  });
});
