import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { SeletorCor } from '@/componentes/formulario/SeletorCor';
import { Botao } from '@/componentes/ui/Botao';
import { CaixaMarcacao } from '@/componentes/ui/CaixaMarcacao';
import { Campo } from '@/componentes/ui/Campo';
import { Dialog, DialogConteudo, DialogTitulo } from '@/componentes/ui/Dialog';
import { Selecao } from '@/componentes/ui/Selecao';
import { ROTULO_TIPO_CONTA, TIPOS_CONTA } from '@/constantes/tipos-conta';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { SeletorIconeConta } from './SeletorIconeConta';
import { useAtualizarConta } from '../hooks/useAtualizarConta';
import { useCriarConta } from '../hooks/useCriarConta';
import { contaSchema } from '../schemas/conta.schema';
import type { ContaFormulario } from '../schemas/conta.schema';
import type { Conta } from '../tipos/conta';
import type { ReactElement } from 'react';

interface FormularioContaProps {
  aberto: boolean;
  aoFechar: () => void;
  conta?: Conta | undefined;
}

function valoresIniciais(conta: Conta | undefined): ContaFormulario {
  return {
    nome: conta?.nome ?? '',
    tipo: conta?.tipo ?? 'CONTA_CORRENTE',
    instituicao: conta?.instituicao ?? undefined,
    saldoInicial: conta?.saldoInicial ?? '0.00',
    cor: conta?.cor ?? '#2563EB',
    icone: conta?.icone ?? 'wallet',
    incluirNoSaldoTotal: conta?.incluirNoSaldoTotal ?? true,
  };
}

/** Radix Dialog so renderiza o conteudo quando `open`, entao cada abertura
 * monta o formulario do zero — sem precisar de useEffect + reset() para
 * alternar entre criar e editar. */
export function FormularioConta({ aberto, aoFechar, conta }: FormularioContaProps): ReactElement {
  const ehEdicao = conta !== undefined;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ContaFormulario>({
    resolver: zodResolver(contaSchema),
    defaultValues: valoresIniciais(conta),
  });
  // react-hook-form's watch() nao e compativel com o React Compiler
  // (react-hooks/incompatible-library) — useWatch e a alternativa oficial.
  const corSelecionada = useWatch({ control, name: 'cor' });
  const iconeSelecionado = useWatch({ control, name: 'icone' });

  const criar = useCriarConta();
  const atualizar = useAtualizarConta();
  const enviando = criar.isPending || atualizar.isPending;
  const erro = criar.error ?? atualizar.error;
  const enviandoRef = useRef(false);

  function aoSubmeter(dados: ContaFormulario): void {
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    const aoTerminar = (): void => {
      enviandoRef.current = false;
    };

    if (ehEdicao) {
      atualizar.mutate({ id: conta.id, dados }, { onSuccess: aoFechar, onSettled: aoTerminar });
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
        <DialogTitulo>{ehEdicao ? 'Editar conta' : 'Nova conta'}</DialogTitulo>

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

          <Selecao rotulo="Tipo" erro={errors.tipo?.message} {...register('tipo')}>
            {TIPOS_CONTA.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ROTULO_TIPO_CONTA[tipo]}
              </option>
            ))}
          </Selecao>

          <Campo
            rotulo="Instituição (opcional)"
            erro={errors.instituicao?.message}
            {...register('instituicao')}
          />

          <Campo
            rotulo="Saldo inicial"
            inputMode="decimal"
            placeholder="0,00"
            erro={errors.saldoInicial?.message}
            {...register('saldoInicial')}
          />

          <SeletorCor
            rotulo="Cor"
            valor={corSelecionada}
            aoAlterar={(cor) => {
              setValue('cor', cor, { shouldValidate: true });
            }}
          />

          <SeletorIconeConta
            valor={iconeSelecionado}
            aoAlterar={(icone) => {
              setValue('icone', icone, { shouldValidate: true });
            }}
          />

          <CaixaMarcacao rotulo="Incluir no saldo total" {...register('incluirNoSaldoTotal')} />

          <Botao type="submit" carregando={enviando}>
            {ehEdicao ? 'Salvar alterações' : 'Criar conta'}
          </Botao>
        </form>
      </DialogConteudo>
    </Dialog>
  );
}
