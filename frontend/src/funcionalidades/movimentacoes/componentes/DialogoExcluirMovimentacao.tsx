import { useState } from 'react';
import { Botao } from '@/componentes/ui/Botao';
import { Dialog, DialogConteudo, DialogDescricao, DialogTitulo } from '@/componentes/ui/Dialog';
import { useExcluirMovimentacao } from '../hooks/useExcluirMovimentacao';
import { ESCOPOS_RECORRENCIA, ROTULO_ESCOPO_RECORRENCIA } from '../tipos/movimentacao';
import type { EscopoRecorrencia, Movimentacao } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface DialogoExcluirMovimentacaoProps {
  movimentacao: Movimentacao | null;
  aoFechar: () => void;
}

/** RN-16/RN-20/RN-39: exclusão é lógica. Para transferência, remove os
 * dois lados. Para uma ocorrência de recorrência, o backend exige um
 * escopo (RN-20) — por isso o diálogo pede a escolha antes de confirmar,
 * em vez de só um "tem certeza?" genérico. */
export function DialogoExcluirMovimentacao({
  movimentacao,
  aoFechar,
}: DialogoExcluirMovimentacaoProps): ReactElement {
  const excluir = useExcluirMovimentacao();
  const [escopo, setEscopo] = useState<EscopoRecorrencia>('APENAS_ESTA');

  function aoMudarAberto(aberto: boolean): void {
    if (!aberto) {
      excluir.reset();
      setEscopo('APENAS_ESTA');
      aoFechar();
    }
  }

  const ehTransferencia = movimentacao?.tipo === 'TRANSFERENCIA';
  const ehOcorrenciaRecorrente = movimentacao?.recorrencia !== null && movimentacao !== null;
  const descricao = movimentacao?.descricao ?? '';

  return (
    <Dialog open={movimentacao !== null} onOpenChange={aoMudarAberto}>
      <DialogConteudo aria-describedby="descricao-excluir-movimentacao">
        <DialogTitulo>Excluir movimentação</DialogTitulo>
        <DialogDescricao id="descricao-excluir-movimentacao">
          {ehTransferencia
            ? `Tem certeza que deseja excluir "${descricao}"? Os dois lados da transferência serão removidos. Esta ação não pode ser desfeita.`
            : `Tem certeza que deseja excluir "${descricao}"? Esta ação não pode ser desfeita.`}
        </DialogDescricao>

        {ehOcorrenciaRecorrente ? (
          <div
            role="radiogroup"
            aria-label="Escopo da exclusão"
            className="mt-4 flex flex-col gap-2"
          >
            {ESCOPOS_RECORRENCIA.map((opcao) => (
              <label key={opcao} className="flex items-center gap-2 text-sm text-texto">
                <input
                  type="radio"
                  name="escopo-exclusao"
                  value={opcao}
                  checked={escopo === opcao}
                  onChange={() => {
                    setEscopo(opcao);
                  }}
                  className="h-4 w-4 border-borda text-primaria focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
                />
                {ROTULO_ESCOPO_RECORRENCIA[opcao]}
              </label>
            ))}
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
          <Botao
            carregando={excluir.isPending}
            onClick={() => {
              if (!movimentacao) return;
              excluir.mutate(
                {
                  id: movimentacao.id,
                  escopoExclusao: ehOcorrenciaRecorrente ? escopo : undefined,
                },
                { onSuccess: aoFechar },
              );
            }}
          >
            Excluir
          </Botao>
        </div>
      </DialogConteudo>
    </Dialog>
  );
}
