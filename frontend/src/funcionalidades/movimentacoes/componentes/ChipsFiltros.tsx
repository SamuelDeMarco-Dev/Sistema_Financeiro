import { X } from 'lucide-react';
import { useCategorias } from '@/funcionalidades/categorias/hooks/useCategorias';
import { useContas } from '@/funcionalidades/contas/hooks/useContas';
import { useEtiquetas } from '@/funcionalidades/etiquetas/hooks/useEtiquetas';
import { formatarDataBr } from '@/utilitarios/data';
import { FILTROS_URL_PADRAO } from '../hooks/useFiltrosUrl';
import { ROTULO_SITUACAO_MOVIMENTACAO, ROTULO_TIPO_MOVIMENTACAO } from '../tipos/movimentacao';
import type { FiltrosMovimentacoesUrl } from '../hooks/useFiltrosUrl';
import type { ReactElement } from 'react';

interface ChipsFiltrosProps {
  filtros: FiltrosMovimentacoesUrl;
  aoAlterar: (parciais: Partial<FiltrosMovimentacoesUrl>) => void;
  aoLimparTodos: () => void;
}

interface Chip {
  chave: string;
  rotulo: string;
  aoRemover: () => void;
}

function Removivel({ chip }: { chip: Chip }): ReactElement {
  return (
    <span className="flex items-center gap-1 rounded-full bg-borda px-3 py-1 text-xs text-texto">
      {chip.rotulo}
      <button
        type="button"
        aria-label={`Remover filtro ${chip.rotulo}`}
        onClick={chip.aoRemover}
        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-fundo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/** RF-34: um chip por valor selecionado (não por categoria de filtro),
 * removível individualmente — remover o único valor de uma lista limpa
 * aquele filtro por completo. */
export function ChipsFiltros({
  filtros,
  aoAlterar,
  aoLimparTodos,
}: ChipsFiltrosProps): ReactElement | null {
  const { data: dadosContas } = useContas();
  const { data: categorias } = useCategorias();
  const { data: etiquetas } = useEtiquetas();

  const nomePorConta = new Map((dadosContas?.contas ?? []).map((conta) => [conta.id, conta.nome]));
  const nomePorCategoria = new Map(
    (categorias ?? []).flatMap((raiz) => [
      [raiz.id, raiz.nome] as const,
      ...raiz.subcategorias.map((sub) => [sub.id, sub.nome] as const),
    ]),
  );
  const nomePorEtiqueta = new Map(
    (etiquetas ?? []).map((etiqueta) => [etiqueta.id, etiqueta.nome]),
  );

  const chips: Chip[] = [];

  if (filtros.dataInicio || filtros.dataFim) {
    const de = filtros.dataInicio ? formatarDataBr(filtros.dataInicio) : '…';
    const ate = filtros.dataFim ? formatarDataBr(filtros.dataFim) : '…';
    chips.push({
      chave: 'periodo',
      rotulo: `Período: ${de} até ${ate}`,
      aoRemover: () => {
        aoAlterar({ dataInicio: null, dataFim: null });
      },
    });
  }
  for (const tipo of filtros.tipo) {
    chips.push({
      chave: `tipo-${tipo}`,
      rotulo: `Tipo: ${ROTULO_TIPO_MOVIMENTACAO[tipo]}`,
      aoRemover: () => {
        aoAlterar({ tipo: filtros.tipo.filter((item) => item !== tipo) });
      },
    });
  }
  for (const situacao of filtros.situacao) {
    chips.push({
      chave: `situacao-${situacao}`,
      rotulo: `Situação: ${ROTULO_SITUACAO_MOVIMENTACAO[situacao]}`,
      aoRemover: () => {
        aoAlterar({ situacao: filtros.situacao.filter((item) => item !== situacao) });
      },
    });
  }
  for (const contaId of filtros.contaId) {
    chips.push({
      chave: `conta-${contaId}`,
      rotulo: `Conta: ${nomePorConta.get(contaId) ?? contaId}`,
      aoRemover: () => {
        aoAlterar({ contaId: filtros.contaId.filter((item) => item !== contaId) });
      },
    });
  }
  for (const categoriaId of filtros.categoriaId) {
    chips.push({
      chave: `categoria-${categoriaId}`,
      rotulo: `Categoria: ${nomePorCategoria.get(categoriaId) ?? categoriaId}`,
      aoRemover: () => {
        aoAlterar({ categoriaId: filtros.categoriaId.filter((item) => item !== categoriaId) });
      },
    });
  }
  for (const etiquetaId of filtros.etiquetaId) {
    chips.push({
      chave: `etiqueta-${etiquetaId}`,
      rotulo: `Etiqueta: ${nomePorEtiqueta.get(etiquetaId) ?? etiquetaId}`,
      aoRemover: () => {
        aoAlterar({ etiquetaId: filtros.etiquetaId.filter((item) => item !== etiquetaId) });
      },
    });
  }
  if (filtros.busca.trim() !== '') {
    chips.push({
      chave: 'busca',
      rotulo: `Busca: "${filtros.busca}"`,
      aoRemover: () => {
        aoAlterar({ busca: FILTROS_URL_PADRAO.busca });
      },
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Removivel key={chip.chave} chip={chip} />
      ))}
      <button
        type="button"
        onClick={aoLimparTodos}
        className="text-xs font-medium text-primaria hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
      >
        Limpar todos
      </button>
    </div>
  );
}
