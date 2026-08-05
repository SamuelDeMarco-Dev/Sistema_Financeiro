import { useState } from 'react';
import { Esqueleto, EstadoErro } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { ArvoreCategorias } from '@/funcionalidades/categorias/componentes/ArvoreCategorias';
import { DialogoExcluirCategoria } from '@/funcionalidades/categorias/componentes/DialogoExcluirCategoria';
import { FormularioCategoria } from '@/funcionalidades/categorias/componentes/FormularioCategoria';
import { useCategorias } from '@/funcionalidades/categorias/hooks/useCategorias';
import type { Categoria, TipoCategoria } from '@/funcionalidades/categorias/tipos/categoria';
import type { KeyboardEvent, ReactElement } from 'react';

const ABAS = [
  { id: 'RECEITA', rotulo: 'Receitas' },
  { id: 'DESPESA', rotulo: 'Despesas' },
] as const satisfies { id: TipoCategoria; rotulo: string }[];

type IdAba = (typeof ABAS)[number]['id'];

function EsqueletoArvore(): ReactElement {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: 5 }, (_, indice) => (
        <Esqueleto key={indice} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function Categorias(): ReactElement {
  const { data: categorias, isLoading, isError, refetch } = useCategorias();
  const [abaAtiva, setAbaAtiva] = useState<IdAba>('DESPESA');

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState<Categoria | undefined>(undefined);
  const [categoriaPaiPadrao, setCategoriaPaiPadrao] = useState<Categoria | undefined>(undefined);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Categoria | null>(null);

  function abrirCriacao(): void {
    setCategoriaEmEdicao(undefined);
    setCategoriaPaiPadrao(undefined);
    setFormularioAberto(true);
  }

  function abrirEdicao(categoria: Categoria): void {
    setCategoriaEmEdicao(categoria);
    setCategoriaPaiPadrao(undefined);
    setFormularioAberto(true);
  }

  function abrirNovaSubcategoria(categoriaPai: Categoria): void {
    setCategoriaEmEdicao(undefined);
    setCategoriaPaiPadrao(categoriaPai);
    setFormularioAberto(true);
  }

  function aoNavegarComTeclado(evento: KeyboardEvent<HTMLDivElement>): void {
    const indiceAtual = ABAS.findIndex((aba) => aba.id === abaAtiva);
    let proximoIndice: number | null = null;

    if (evento.key === 'ArrowRight') proximoIndice = (indiceAtual + 1) % ABAS.length;
    else if (evento.key === 'ArrowLeft')
      proximoIndice = (indiceAtual - 1 + ABAS.length) % ABAS.length;
    else if (evento.key === 'Home') proximoIndice = 0;
    else if (evento.key === 'End') proximoIndice = ABAS.length - 1;

    if (proximoIndice === null) return;
    evento.preventDefault();
    const proximaAba = ABAS[proximoIndice];
    if (!proximaAba) return;
    setAbaAtiva(proximaAba.id);
    document.getElementById(`aba-categorias-${proximaAba.id}`)?.focus();
  }

  const todas = categorias ?? [];
  // RN-10: categorias AMBOS servem tanto para receita quanto para despesa
  // — aparecem nas duas abas, nao so numa.
  const raizesPorAba = (tipo: IdAba): Categoria[] =>
    todas.filter(
      (categoria) =>
        categoria.categoriaPaiId === null &&
        (categoria.tipo === tipo || categoria.tipo === 'AMBOS'),
    );

  return (
    <div className="mx-auto flex min-w-0 max-w-2xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-texto">Categorias</h1>
        <Botao onClick={abrirCriacao}>Nova categoria</Botao>
      </header>

      {isLoading ? <EsqueletoArvore /> : null}

      {isError ? (
        <EstadoErro
          mensagem="Não foi possível carregar suas categorias."
          onTentarNovamente={() => {
            void refetch();
          }}
        />
      ) : null}

      {categorias ? (
        <>
          <div
            role="tablist"
            aria-label="Tipo de categoria"
            onKeyDown={aoNavegarComTeclado}
            tabIndex={-1}
            className="flex gap-1 border-b border-borda"
          >
            {ABAS.map((aba) => (
              <button
                key={aba.id}
                id={`aba-categorias-${aba.id}`}
                type="button"
                role="tab"
                aria-selected={abaAtiva === aba.id}
                aria-controls={`painel-categorias-${aba.id}`}
                tabIndex={abaAtiva === aba.id ? 0 : -1}
                onClick={() => {
                  setAbaAtiva(aba.id);
                }}
                className={
                  abaAtiva === aba.id
                    ? 'border-b-2 border-primaria px-4 py-2 text-sm font-semibold text-primaria'
                    : 'border-b-2 border-transparent px-4 py-2 text-sm font-medium text-textoSuave hover:text-texto'
                }
              >
                {aba.rotulo}
              </button>
            ))}
          </div>

          {ABAS.map((aba) => (
            <div
              key={aba.id}
              id={`painel-categorias-${aba.id}`}
              role="tabpanel"
              aria-labelledby={`aba-categorias-${aba.id}`}
              hidden={abaAtiva !== aba.id}
            >
              {abaAtiva === aba.id ? (
                <ArvoreCategorias
                  categorias={raizesPorAba(aba.id)}
                  onEditar={abrirEdicao}
                  onExcluir={setCategoriaParaExcluir}
                  onNovaSubcategoria={abrirNovaSubcategoria}
                />
              ) : null}
            </div>
          ))}
        </>
      ) : null}

      <FormularioCategoria
        aberto={formularioAberto}
        aoFechar={() => {
          setFormularioAberto(false);
        }}
        categorias={todas}
        categoria={categoriaEmEdicao}
        tipoPadrao={abaAtiva}
        categoriaPaiPadrao={categoriaPaiPadrao}
      />
      <DialogoExcluirCategoria
        categoria={categoriaParaExcluir}
        categorias={todas}
        aoFechar={() => {
          setCategoriaParaExcluir(null);
        }}
      />
    </div>
  );
}
