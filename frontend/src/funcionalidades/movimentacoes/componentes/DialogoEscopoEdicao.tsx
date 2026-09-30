import { useState } from 'react';
import { Botao } from '@/componentes/ui/Botao';
import { Dialog, DialogConteudo, DialogDescricao, DialogTitulo } from '@/componentes/ui/Dialog';
import { ESCOPOS_RECORRENCIA } from '../tipos/movimentacao';
import type { EscopoRecorrencia, Movimentacao } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface DialogoEscopoEdicaoProps {
  movimentacao: Movimentacao | null;
  aoFechar: () => void;
  aoConfirmar: (escopo: EscopoRecorrencia) => void;
}

const EXPLICACAO: Record<EscopoRecorrencia, string> = {
  APENAS_ESTA: 'Só esta ocorrência muda — ela passa a divergir do modelo da recorrência.',
  ESTA_E_FUTURAS:
    'Esta e as próximas ocorrências ainda não pagas mudam. As já pagas e as anteriores ficam como estão.',
  TODAS: 'Todas as ocorrências ainda não pagas mudam, incluindo as anteriores a esta.',
};

/** RN-19: editar a ocorrência de uma movimentação recorrente exige um
 * escopo explícito — este diálogo pede a escolha antes de abrir o
 * formulário, com as três opções explicadas (não só o rótulo). */
export function DialogoEscopoEdicao({
  movimentacao,
  aoFechar,
  aoConfirmar,
}: DialogoEscopoEdicaoProps): ReactElement {
  const [escopo, setEscopo] = useState<EscopoRecorrencia>('APENAS_ESTA');

  function aoMudarAberto(aberto: boolean): void {
    if (!aberto) {
      setEscopo('APENAS_ESTA');
      aoFechar();
    }
  }

  return (
    <Dialog open={movimentacao !== null} onOpenChange={aoMudarAberto}>
      <DialogConteudo aria-describedby="descricao-escopo-edicao">
        <DialogTitulo>Editar movimentação recorrente</DialogTitulo>
        <DialogDescricao id="descricao-escopo-edicao">
          Esta movimentação faz parte de uma recorrência. O que você quer alterar?
        </DialogDescricao>

        <div role="radiogroup" aria-label="Escopo da edição" className="mt-4 flex flex-col gap-3">
          {ESCOPOS_RECORRENCIA.map((opcao) => (
            <label
              key={opcao}
              className="grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-0.5 rounded-md border border-borda p-3 text-sm hover:bg-borda/40"
            >
              <input
                type="radio"
                name="escopo-edicao"
                value={opcao}
                checked={escopo === opcao}
                onChange={() => {
                  setEscopo(opcao);
                }}
                className="row-span-2 mt-0.5 h-4 w-4 border-borda text-primaria focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
              />
              <span className="font-medium text-texto">
                {opcao === 'APENAS_ESTA'
                  ? 'Apenas esta ocorrência'
                  : opcao === 'ESTA_E_FUTURAS'
                    ? 'Esta e as futuras'
                    : 'Todas as ocorrências'}
              </span>
              <span className="text-textoSuave">{EXPLICACAO[opcao]}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Botao
            variante="secundaria"
            onClick={() => {
              aoMudarAberto(false);
            }}
          >
            Cancelar
          </Botao>
          <Botao
            onClick={() => {
              aoConfirmar(escopo);
            }}
          >
            Continuar
          </Botao>
        </div>
      </DialogConteudo>
    </Dialog>
  );
}
