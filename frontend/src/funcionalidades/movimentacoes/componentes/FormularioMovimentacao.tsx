import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { CampoData } from '@/componentes/formulario/CampoData';
import { CampoMoeda } from '@/componentes/formulario/CampoMoeda';
import { Botao } from '@/componentes/ui/Botao';
import { Campo } from '@/componentes/ui/Campo';
import { Dialog, DialogConteudo, DialogTitulo } from '@/componentes/ui/Dialog';
import { Selecao } from '@/componentes/ui/Selecao';
import { SelecionadorCategoria } from '@/funcionalidades/categorias/componentes/SelecionadorCategoria';
import { useCategorias } from '@/funcionalidades/categorias/hooks/useCategorias';
import { SelecionadorConta } from '@/funcionalidades/contas/componentes/SelecionadorConta';
import { useContas } from '@/funcionalidades/contas/hooks/useContas';
import { SelecionadorEtiquetas } from '@/funcionalidades/etiquetas/componentes/SelecionadorEtiquetas';
import { useEtiquetas } from '@/funcionalidades/etiquetas/hooks/useEtiquetas';
import { usePerfil } from '@/funcionalidades/perfil/hooks/usePerfil';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { useAtualizarMovimentacao } from '../hooks/useAtualizarMovimentacao';
import { useCriarMovimentacao } from '../hooks/useCriarMovimentacao';
import { movimentacaoSchema } from '../schemas/movimentacao.schema';
import {
  ROTULO_SITUACAO_MOVIMENTACAO,
  SITUACOES_MOVIMENTACAO,
  TIPOS_MOVIMENTACAO_CRIACAO,
} from '../tipos/movimentacao';
import type { MovimentacaoFormulario } from '../schemas/movimentacao.schema';
import type { Movimentacao } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface FormularioMovimentacaoProps {
  aberto: boolean;
  aoFechar: () => void;
  movimentacao?: Movimentacao | undefined;
}

function valoresIniciais(movimentacao: Movimentacao | undefined): MovimentacaoFormulario {
  return {
    tipo: movimentacao?.tipo === 'RECEITA' ? 'RECEITA' : 'DESPESA',
    descricao: movimentacao?.descricao ?? '',
    observacao: movimentacao?.observacao ?? undefined,
    valor: movimentacao?.valor ?? '0.00',
    dataCompetencia: movimentacao?.dataCompetencia ?? null,
    dataVencimento: movimentacao?.dataVencimento ?? null,
    situacao: movimentacao?.situacao ?? 'PENDENTE',
    dataEfetivacao: movimentacao?.dataEfetivacao ?? null,
    valorPago: movimentacao?.situacao === 'PAGA_PARCIALMENTE' ? movimentacao.valorPago : undefined,
    contaId: movimentacao?.conta?.id ?? '',
    categoriaId: movimentacao?.categoria?.id ?? '',
    etiquetaIds: movimentacao?.etiquetas.map((etiqueta) => etiqueta.id) ?? [],
  };
}

/** RF-23/RF-24: formulário único para receita e despesa — a recorrência
 * (RF-27) chega na issue #43. Radix Dialog só renderiza quando `open`,
 * então cada abertura monta o formulário do zero (mesmo raciocínio de
 * `FormularioConta`). */
export function FormularioMovimentacao({
  aberto,
  aoFechar,
  movimentacao,
}: FormularioMovimentacaoProps): ReactElement {
  const ehEdicao = movimentacao !== undefined;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<MovimentacaoFormulario>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: valoresIniciais(movimentacao),
  });

  const tipoSelecionado = useWatch({ control, name: 'tipo' });
  const valorSelecionado = useWatch({ control, name: 'valor' });
  const dataCompetenciaSelecionada = useWatch({ control, name: 'dataCompetencia' });
  const dataVencimentoSelecionada = useWatch({ control, name: 'dataVencimento' });
  const situacaoSelecionada = useWatch({ control, name: 'situacao' });
  const dataEfetivacaoSelecionada = useWatch({ control, name: 'dataEfetivacao' });
  const valorPagoSelecionado = useWatch({ control, name: 'valorPago' });
  const contaSelecionada = useWatch({ control, name: 'contaId' });
  const categoriaSelecionada = useWatch({ control, name: 'categoriaId' });
  const etiquetasSelecionadas = useWatch({ control, name: 'etiquetaIds' });

  const { data: perfil } = usePerfil();
  const { data: dadosContas } = useContas();
  const { data: categorias } = useCategorias();
  const { data: etiquetas } = useEtiquetas();

  const criar = useCriarMovimentacao();
  const atualizar = useAtualizarMovimentacao();
  const enviando = criar.isPending || atualizar.isPending;
  const erro = criar.error ?? atualizar.error;
  const enviandoRef = useRef(false);

  const efetivada = situacaoSelecionada === 'PAGA' || situacaoSelecionada === 'PAGA_PARCIALMENTE';
  const timezone = perfil?.timezone ?? 'America/Sao_Paulo';

  function aoSubmeter(dados: MovimentacaoFormulario): void {
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    const aoTerminar = (): void => {
      enviandoRef.current = false;
    };

    const payloadComum = {
      descricao: dados.descricao,
      observacao: dados.observacao,
      valor: dados.valor,
      dataCompetencia: dados.dataCompetencia ?? '',
      dataVencimento: dados.dataVencimento ?? undefined,
      categoriaId: dados.categoriaId,
      etiquetaIds: dados.etiquetaIds,
    };

    if (ehEdicao) {
      atualizar.mutate(
        { id: movimentacao.id, dados: { ...payloadComum, tipo: dados.tipo } },
        { onSuccess: aoFechar, onSettled: aoTerminar },
      );
      return;
    }

    criar.mutate(
      {
        ...payloadComum,
        tipo: dados.tipo,
        contaId: dados.contaId,
        situacao: dados.situacao,
        dataEfetivacao: dados.dataEfetivacao ?? undefined,
        valorPago: dados.valorPago,
      },
      { onSuccess: aoFechar, onSettled: aoTerminar },
    );
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoAberto) => {
        if (!novoAberto) aoFechar();
      }}
    >
      <DialogConteudo aria-describedby={undefined} className="max-w-lg">
        <DialogTitulo>{ehEdicao ? 'Editar movimentação' : 'Nova movimentação'}</DialogTitulo>

        <form
          noValidate
          onSubmit={(evento) => {
            void handleSubmit(aoSubmeter)(evento);
          }}
          className="mt-4 flex flex-col gap-4"
        >
          {erro ? (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-md bg-perigo/10 p-3 text-sm text-perigo"
            >
              {traduzirErroApi(erro)}
            </p>
          ) : null}

          <div className="flex gap-2" role="radiogroup" aria-label="Tipo">
            {TIPOS_MOVIMENTACAO_CRIACAO.map((tipo) => (
              <Botao
                key={tipo}
                type="button"
                variante={tipoSelecionado === tipo ? 'primaria' : 'secundaria'}
                aria-pressed={tipoSelecionado === tipo}
                className="flex-1"
                onClick={() => {
                  setValue('tipo', tipo, { shouldValidate: true });
                  setValue('categoriaId', '', { shouldValidate: true });
                }}
              >
                {tipo === 'RECEITA' ? 'Receita' : 'Despesa'}
              </Botao>
            ))}
          </div>

          <Campo rotulo="Descrição" erro={errors.descricao?.message} {...register('descricao')} />

          <CampoMoeda
            rotulo="Valor"
            valor={valorSelecionado}
            aoAlterar={(valor) => {
              setValue('valor', valor, { shouldValidate: true });
            }}
            erro={errors.valor?.message}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CampoData
              rotulo="Data de competência"
              valor={dataCompetenciaSelecionada}
              aoAlterar={(dataIso) => {
                setValue('dataCompetencia', dataIso, { shouldValidate: true });
              }}
              timezone={timezone}
              erro={errors.dataCompetencia?.message}
            />
            <CampoData
              rotulo="Data de vencimento (opcional)"
              valor={dataVencimentoSelecionada}
              aoAlterar={(dataIso) => {
                setValue('dataVencimento', dataIso, { shouldValidate: true });
              }}
              timezone={timezone}
              erro={errors.dataVencimento?.message}
            />
          </div>

          <SelecionadorConta
            rotulo="Conta"
            contas={dadosContas?.contas ?? []}
            valor={contaSelecionada}
            aoAlterar={(contaId) => {
              setValue('contaId', contaId, { shouldValidate: true });
            }}
            erro={errors.contaId?.message}
          />

          <SelecionadorCategoria
            rotulo="Categoria"
            categorias={categorias ?? []}
            tipo={tipoSelecionado}
            valor={categoriaSelecionada}
            aoAlterar={(categoriaId) => {
              setValue('categoriaId', categoriaId, { shouldValidate: true });
            }}
            erro={errors.categoriaId?.message}
          />

          {!ehEdicao ? (
            <Selecao rotulo="Situação" erro={errors.situacao?.message} {...register('situacao')}>
              {SITUACOES_MOVIMENTACAO.filter((situacao) => situacao !== 'ATRASADA').map(
                (situacao) => (
                  <option key={situacao} value={situacao}>
                    {ROTULO_SITUACAO_MOVIMENTACAO[situacao]}
                  </option>
                ),
              )}
            </Selecao>
          ) : null}

          {!ehEdicao && efetivada ? (
            <CampoData
              rotulo="Data de efetivação"
              valor={dataEfetivacaoSelecionada}
              aoAlterar={(dataIso) => {
                setValue('dataEfetivacao', dataIso, { shouldValidate: true });
              }}
              timezone={timezone}
              erro={errors.dataEfetivacao?.message}
            />
          ) : null}

          {!ehEdicao && situacaoSelecionada === 'PAGA_PARCIALMENTE' ? (
            <CampoMoeda
              rotulo="Valor pago"
              valor={valorPagoSelecionado ?? '0.00'}
              aoAlterar={(valor) => {
                setValue('valorPago', valor, { shouldValidate: true });
              }}
              erro={errors.valorPago?.message}
            />
          ) : null}

          <SelecionadorEtiquetas
            rotulo="Etiquetas"
            etiquetas={etiquetas ?? []}
            valor={etiquetasSelecionadas}
            aoAlterar={(etiquetaIds) => {
              setValue('etiquetaIds', etiquetaIds, { shouldValidate: true });
            }}
          />

          <Campo
            rotulo="Observação (opcional)"
            erro={errors.observacao?.message}
            {...register('observacao')}
          />

          <Botao type="submit" carregando={enviando}>
            {ehEdicao ? 'Salvar alterações' : 'Criar movimentação'}
          </Botao>
        </form>
      </DialogConteudo>
    </Dialog>
  );
}
