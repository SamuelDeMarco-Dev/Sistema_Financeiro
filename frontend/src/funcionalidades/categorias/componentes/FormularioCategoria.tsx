import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { SeletorCor } from '@/componentes/formulario/SeletorCor';
import { Botao } from '@/componentes/ui/Botao';
import { Campo } from '@/componentes/ui/Campo';
import { Dialog, DialogConteudo, DialogTitulo } from '@/componentes/ui/Dialog';
import { Selecao } from '@/componentes/ui/Selecao';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { SeletorCategoriaPai } from './SeletorCategoriaPai';
import { SeletorIconeCategoria } from './SeletorIconeCategoria';
import { useAtualizarCategoria } from '../hooks/useAtualizarCategoria';
import { useCriarCategoria } from '../hooks/useCriarCategoria';
import { categoriaSchema } from '../schemas/categoria.schema';
import { TIPOS_CATEGORIA } from '../tipos/categoria';
import type { CategoriaFormulario } from '../schemas/categoria.schema';
import type { Categoria, TipoCategoria } from '../tipos/categoria';
import type { ReactElement } from 'react';

const ROTULO_TIPO: Record<TipoCategoria, string> = {
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
  AMBOS: 'Ambos',
};

interface FormularioCategoriaProps {
  aberto: boolean;
  aoFechar: () => void;
  categorias: Categoria[];
  categoria?: Categoria | undefined;
  tipoPadrao?: TipoCategoria;
  categoriaPaiPadrao?: Categoria | undefined;
}

function valoresIniciais(
  categoria: Categoria | undefined,
  tipoPadrao: TipoCategoria,
  categoriaPaiPadrao: Categoria | undefined,
): CategoriaFormulario {
  return {
    nome: categoria?.nome ?? '',
    tipo: categoria?.tipo ?? categoriaPaiPadrao?.tipo ?? tipoPadrao,
    cor: categoria?.cor ?? '#64748B',
    icone: categoria?.icone ?? 'tag',
    categoriaPaiId: categoria?.categoriaPaiId ?? categoriaPaiPadrao?.id ?? null,
  };
}

/** RF-20 a RF-22: criar/editar categoria. O campo `tipo` fica bloqueado na
 * edicao quando ha movimentacoes vinculadas — mudar o tipo reclassificaria
 * lancamentos existentes (RN-10). */
export function FormularioCategoria({
  aberto,
  aoFechar,
  categorias,
  categoria,
  tipoPadrao = 'DESPESA',
  categoriaPaiPadrao,
}: FormularioCategoriaProps): ReactElement {
  const ehEdicao = categoria !== undefined;
  const tipoBloqueado =
    (ehEdicao && categoria.quantidadeMovimentacoes > 0) || categoriaPaiPadrao !== undefined;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CategoriaFormulario>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: valoresIniciais(categoria, tipoPadrao, categoriaPaiPadrao),
  });
  const corSelecionada = useWatch({ control, name: 'cor' });
  const iconeSelecionado = useWatch({ control, name: 'icone' });
  const tipoSelecionado = useWatch({ control, name: 'tipo' });
  const categoriaPaiSelecionada = useWatch({ control, name: 'categoriaPaiId' });

  const criar = useCriarCategoria();
  const atualizar = useAtualizarCategoria();
  const enviando = criar.isPending || atualizar.isPending;
  const erro = criar.error ?? atualizar.error;
  const enviandoRef = useRef(false);

  function aoSubmeter(dados: CategoriaFormulario): void {
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    const aoTerminar = (): void => {
      enviandoRef.current = false;
    };

    if (ehEdicao) {
      atualizar.mutate(
        {
          id: categoria.id,
          dados: { nome: dados.nome, tipo: dados.tipo, cor: dados.cor, icone: dados.icone },
        },
        { onSuccess: aoFechar, onSettled: aoTerminar },
      );
    } else {
      criar.mutate(dados, { onSuccess: aoFechar, onSettled: aoTerminar });
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoAberto) => {
        if (!novoAberto) aoFechar();
      }}
    >
      <DialogConteudo aria-describedby={undefined}>
        <DialogTitulo>{ehEdicao ? 'Editar categoria' : 'Nova categoria'}</DialogTitulo>

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

          <Campo rotulo="Nome" erro={errors.nome?.message} {...register('nome')} />

          <div className="flex flex-col gap-1">
            <Selecao
              rotulo="Tipo"
              erro={errors.tipo?.message}
              disabled={tipoBloqueado}
              {...register('tipo')}
            >
              {TIPOS_CATEGORIA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ROTULO_TIPO[tipo]}
                </option>
              ))}
            </Selecao>
            {tipoBloqueado ? (
              <p className="text-sm text-textoSuave">
                {categoriaPaiPadrao
                  ? `O tipo acompanha a categoria pai (${ROTULO_TIPO[categoriaPaiPadrao.tipo]}).`
                  : 'O tipo não pode ser alterado: esta categoria já tem movimentações vinculadas.'}
              </p>
            ) : null}
          </div>

          {/* PATCH /categorias/:id nao aceita categoriaPaiId — o backend
              nao suporta re-parentar uma categoria existente. Quando a
              categoria pai ja vem fixada (fluxo "nova subcategoria"), nao
              ha o que escolher. */}
          {!ehEdicao && !categoriaPaiPadrao ? (
            <SeletorCategoriaPai
              categorias={categorias}
              tipo={tipoSelecionado}
              valor={categoriaPaiSelecionada ?? ''}
              aoAlterar={(categoriaPaiId) => {
                setValue('categoriaPaiId', categoriaPaiId === '' ? null : categoriaPaiId);
              }}
            />
          ) : null}

          <SeletorCor
            rotulo="Cor"
            valor={corSelecionada}
            aoAlterar={(cor) => {
              setValue('cor', cor, { shouldValidate: true });
            }}
          />

          <SeletorIconeCategoria
            valor={iconeSelecionado}
            aoAlterar={(icone) => {
              setValue('icone', icone, { shouldValidate: true });
            }}
          />

          <Botao type="submit" carregando={enviando}>
            {ehEdicao ? 'Salvar alterações' : 'Criar categoria'}
          </Botao>
        </form>
      </DialogConteudo>
    </Dialog>
  );
}
