import { Selecao } from '@/componentes/ui/Selecao';
import type { Categoria, TipoCategoria } from '../tipos/categoria';
import type { ReactElement } from 'react';

interface SeletorCategoriaPaiProps {
  categorias: Categoria[];
  tipo: TipoCategoria;
  categoriaAtualId?: string;
  valor: string;
  aoAlterar: (categoriaPaiId: string) => void;
}

const SEM_PAI = '';

/** RF-21: so oferece raizes do mesmo tipo — subcategoria de subcategoria
 * e subcategoria de tipo diferente do pai sao 422 no backend (RN-10). */
export function SeletorCategoriaPai({
  categorias,
  tipo,
  categoriaAtualId,
  valor,
  aoAlterar,
}: SeletorCategoriaPaiProps): ReactElement {
  const raizesDoTipo = categorias.filter(
    (categoria) =>
      categoria.categoriaPaiId === null &&
      categoria.tipo === tipo &&
      categoria.id !== categoriaAtualId,
  );

  return (
    <Selecao
      rotulo="Categoria pai (opcional)"
      value={valor}
      onChange={(evento) => {
        aoAlterar(evento.target.value);
      }}
    >
      <option value={SEM_PAI}>Nenhuma — categoria raiz</option>
      {raizesDoTipo.map((raiz) => (
        <option key={raiz.id} value={raiz.id}>
          {raiz.nome}
        </option>
      ))}
    </Selecao>
  );
}
