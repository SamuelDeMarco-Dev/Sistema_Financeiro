import { useState } from 'react';
import { Botao } from '@/componentes/ui/Botao';
import { Dialog, DialogConteudo, DialogDescricao, DialogTitulo } from '@/componentes/ui/Dialog';
import { Selecao } from '@/componentes/ui/Selecao';
import { useExcluirCategoria } from '../hooks/useExcluirCategoria';
import type { Categoria } from '../tipos/categoria';
import type { ReactElement } from 'react';

interface DialogoExcluirCategoriaProps {
  categoria: Categoria | null;
  categorias: Categoria[];
  aoFechar: () => void;
}

/** RF-22: 422 REGRA_NEGOCIO (tem subcategorias) so permite cancelar; 409
 * RECURSO_EM_USO (tem movimentacoes) oferece escolher o destino da
 * recategorizacao antes de tentar excluir de novo. */
export function DialogoExcluirCategoria({
  categoria,
  categorias,
  aoFechar,
}: DialogoExcluirCategoriaProps): ReactElement {
  const excluir = useExcluirCategoria();
  const [destino, setDestino] = useState('');

  const temSubcategorias = excluir.error?.codigo === 'REGRA_NEGOCIO';
  const emUso = excluir.error?.codigo === 'RECURSO_EM_USO';
  const opcoesDestino = categoria
    ? categorias.filter((c) => c.tipo === categoria.tipo && c.id !== categoria.id)
    : [];

  function aoMudarAberto(aberto: boolean): void {
    if (!aberto) {
      excluir.reset();
      setDestino('');
      aoFechar();
    }
  }

  function aoConfirmar(): void {
    if (!categoria) return;
    excluir.mutate(
      { id: categoria.id, recategorizarPara: emUso ? destino : undefined },
      { onSuccess: aoFechar },
    );
  }

  return (
    <Dialog open={categoria !== null} onOpenChange={aoMudarAberto}>
      <DialogConteudo aria-describedby="descricao-excluir-categoria">
        <DialogTitulo>Excluir categoria</DialogTitulo>
        <DialogDescricao id="descricao-excluir-categoria">
          {temSubcategorias || emUso
            ? excluir.error?.message
            : `Tem certeza que deseja excluir "${categoria?.nome}"? Esta ação não pode ser desfeita.`}
        </DialogDescricao>

        {emUso ? (
          <div className="mt-4">
            <Selecao
              rotulo="Mover as movimentações para"
              value={destino}
              onChange={(evento) => {
                setDestino(evento.target.value);
              }}
            >
              <option value="">Selecione uma categoria...</option>
              {opcoesDestino.map((opcao) => (
                <option key={opcao.id} value={opcao.id}>
                  {opcao.nome}
                </option>
              ))}
            </Selecao>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Botao
            variante="secundaria"
            onClick={() => {
              aoMudarAberto(false);
            }}
          >
            Cancelar
          </Botao>
          {!temSubcategorias ? (
            <Botao
              carregando={excluir.isPending}
              disabled={emUso && destino === ''}
              onClick={aoConfirmar}
            >
              {emUso ? 'Recategorizar e excluir' : 'Excluir'}
            </Botao>
          ) : null}
        </div>
      </DialogConteudo>
    </Dialog>
  );
}
