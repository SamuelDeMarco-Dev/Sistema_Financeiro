import { createElement } from 'react';
import { Esqueleto, EstadoErro, EstadoVazio } from '@/componentes/feedback';
import { resolverIcone } from '@/constantes/icones';
import { useCategorias } from '@/funcionalidades/categorias/hooks/useCategorias';
import type { Categoria } from '@/funcionalidades/categorias/tipos/categoria';
import type { ContaCompartilhadaDetalhe } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface AbaCategoriasGrupoProps {
  grupo: ContaCompartilhadaDetalhe;
}

function LinhaCategoria({
  categoria,
  aninhada = false,
}: {
  categoria: Categoria;
  aninhada?: boolean;
}): ReactElement {
  return (
    <li className={aninhada ? 'ml-6' : ''}>
      <div className="flex min-w-0 items-center gap-3 rounded-md border border-borda bg-superficie p-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${categoria.cor}1A`, color: categoria.cor }}
        >
          {createElement(resolverIcone(categoria.icone), {
            className: 'h-4 w-4',
            'aria-hidden': true,
          })}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-texto">{categoria.nome}</p>
        <span className="shrink-0 text-xs text-textoSuave">
          {categoria.quantidadeMovimentacoes}{' '}
          {categoria.quantidadeMovimentacoes === 1 ? 'lançamento' : 'lançamentos'}
        </span>
      </div>
      {categoria.subcategorias.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2">
          {categoria.subcategorias.map((sub) => (
            <LinhaCategoria key={sub.id} categoria={sub} aninhada />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** RF-58: o grupo tem categorias proprias, separadas das pessoais. A
 * gestao (criar/editar/excluir) vive em /categorias, que ja conhece o
 * escopo de grupo (issue #72) — aqui a aba mostra o que existe e diz quem
 * pode mexer, lendo `minhasPermissoes` em vez de comparar papel. */
export function AbaCategoriasGrupo({ grupo }: AbaCategoriasGrupoProps): ReactElement {
  const { data, isLoading, isError, refetch } = useCategorias({ contaCompartilhadaId: grupo.id });

  if (isLoading) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, indice) => (
          <Esqueleto key={indice} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EstadoErro
        mensagem="Não foi possível carregar as categorias do grupo."
        onTentarNovamente={() => {
          void refetch();
        }}
      />
    );
  }

  const categorias = data ?? [];
  if (categorias.length === 0) {
    return <EstadoVazio titulo="Nenhuma categoria neste grupo" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-textoSuave">
        {grupo.minhasPermissoes.podeGerenciarCategorias
          ? 'Estas categorias são só deste grupo. Para criar ou editar, use a página Categorias.'
          : 'Estas categorias são só deste grupo. Somente o administrador pode alterá-las.'}
      </p>
      <ul className="flex flex-col gap-2">
        {categorias.map((categoria) => (
          <LinhaCategoria key={categoria.id} categoria={categoria} />
        ))}
      </ul>
    </div>
  );
}
