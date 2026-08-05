import { useState } from 'react';
import { ItemCategoria } from './ItemCategoria';
import type { Categoria } from '../tipos/categoria';
import type { KeyboardEvent, ReactElement } from 'react';

interface ArvoreCategoriasProps {
  categorias: Categoria[];
  onEditar: (categoria: Categoria) => void;
  onExcluir: (categoria: Categoria) => void;
  onNovaSubcategoria: (categoriaPai: Categoria) => void;
}

interface NoVisivel {
  categoria: Categoria;
  nivel: 1 | 2;
  paiId: string | null;
}

function listarVisiveis(categorias: Categoria[], expandido: Record<string, boolean>): NoVisivel[] {
  const lista: NoVisivel[] = [];
  for (const raiz of categorias) {
    lista.push({ categoria: raiz, nivel: 1, paiId: null });
    if (expandido[raiz.id]) {
      for (const sub of raiz.subcategorias) {
        lista.push({ categoria: sub, nivel: 2, paiId: raiz.id });
      }
    }
  }
  return lista;
}

function focar(id: string): void {
  document.getElementById(`categoria-${id}`)?.focus();
}

/** RF-20/RF-21: arvore com pai expansivel e filhos indentados, seguindo o
 * padrao WAI-ARIA `tree`/`treeitem` — setas navegam e expandem/recolhem,
 * Enter alterna expansao (A11Y-02). */
export function ArvoreCategorias({
  categorias,
  onEditar,
  onExcluir,
  onNovaSubcategoria,
}: ArvoreCategoriasProps): ReactElement {
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [focoId, setFocoId] = useState<string | undefined>(undefined);
  const visiveis = listarVisiveis(categorias, expandido);
  const idFocoAtual = focoId ?? visiveis[0]?.categoria.id;

  function alternarExpandido(id: string): void {
    setExpandido((atual) => ({ ...atual, [id]: !atual[id] }));
  }

  function aoTeclado(evento: KeyboardEvent<HTMLDivElement>, no: NoVisivel, indice: number): void {
    const temFilhos = no.categoria.subcategorias.length > 0;

    switch (evento.key) {
      case 'ArrowDown': {
        evento.preventDefault();
        const proximo = visiveis[indice + 1];
        if (proximo) focar(proximo.categoria.id);
        break;
      }
      case 'ArrowUp': {
        evento.preventDefault();
        const anterior = visiveis[indice - 1];
        if (anterior) focar(anterior.categoria.id);
        break;
      }
      case 'ArrowRight': {
        evento.preventDefault();
        if (!temFilhos) break;
        if (!expandido[no.categoria.id]) {
          alternarExpandido(no.categoria.id);
        } else {
          const primeiroFilho = visiveis[indice + 1];
          if (primeiroFilho?.paiId === no.categoria.id) focar(primeiroFilho.categoria.id);
        }
        break;
      }
      case 'ArrowLeft': {
        evento.preventDefault();
        if (temFilhos && expandido[no.categoria.id]) {
          alternarExpandido(no.categoria.id);
        } else if (no.paiId) {
          focar(no.paiId);
        }
        break;
      }
      case 'Enter': {
        if (!temFilhos) break;
        evento.preventDefault();
        alternarExpandido(no.categoria.id);
        break;
      }
      default:
        break;
    }
  }

  if (categorias.length === 0) {
    return <p className="text-sm text-textoSuave">Nenhuma categoria neste tipo ainda.</p>;
  }

  return (
    <div role="tree" aria-label="Categorias" className="flex flex-col gap-0.5">
      {visiveis.map((no, indice) => (
        <ItemCategoria
          key={no.categoria.id}
          categoria={no.categoria}
          nivel={no.nivel}
          expandido={Boolean(expandido[no.categoria.id])}
          temFilhos={no.categoria.subcategorias.length > 0}
          onAlternarExpandido={() => {
            alternarExpandido(no.categoria.id);
          }}
          onEditar={() => {
            onEditar(no.categoria);
          }}
          onExcluir={() => {
            onExcluir(no.categoria);
          }}
          onNovaSubcategoria={
            no.nivel === 1
              ? () => {
                  onNovaSubcategoria(no.categoria);
                }
              : undefined
          }
          onTeclado={(evento) => {
            aoTeclado(evento, no, indice);
          }}
          foco={no.categoria.id === idFocoAtual}
          onFoco={() => {
            setFocoId(no.categoria.id);
          }}
        />
      ))}
    </div>
  );
}
