import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { CampoData } from '@/componentes/formulario/CampoData';
import { CampoMoeda } from '@/componentes/formulario/CampoMoeda';
import { Botao } from '@/componentes/ui/Botao';
import { Campo } from '@/componentes/ui/Campo';
import { Dialog, DialogConteudo, DialogTitulo } from '@/componentes/ui/Dialog';
import { SelecionadorConta } from '@/funcionalidades/contas/componentes/SelecionadorConta';
import { useContas } from '@/funcionalidades/contas/hooks/useContas';
import { usePerfil } from '@/funcionalidades/perfil/hooks/usePerfil';
import { aplicarErrosDeCampo } from '@/utilitarios/aplicar-erros-campo';
import { deCentavos, paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { useCriarTransferencia } from '../hooks/useCriarTransferencia';
import { transferenciaSchema } from '../schemas/transferencia.schema';
import type { TransferenciaFormulario } from '../schemas/transferencia.schema';
import type { ReactElement } from 'react';

interface FormularioTransferenciaProps {
  aberto: boolean;
  aoFechar: () => void;
}

function valoresIniciais(): TransferenciaFormulario {
  return {
    contaOrigemId: '',
    contaDestinoId: '',
    valor: '0.00',
    data: null,
    descricao: undefined,
  };
}

/** RF-36/RN-24 a RN-26: transferência entre duas contas próprias — sempre
 * um par atômico no backend. A conta de origem nunca aparece como opção de
 * destino (RN-24 antecipada na UI, não só validada depois do envio). */
export function FormularioTransferencia({
  aberto,
  aoFechar,
}: FormularioTransferenciaProps): ReactElement {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<TransferenciaFormulario>({
    resolver: zodResolver(transferenciaSchema),
    defaultValues: valoresIniciais(),
  });

  const contaOrigemId = useWatch({ control, name: 'contaOrigemId' });
  const contaDestinoId = useWatch({ control, name: 'contaDestinoId' });
  const valorSelecionado = useWatch({ control, name: 'valor' });
  const dataSelecionada = useWatch({ control, name: 'data' });

  const { data: perfil } = usePerfil();
  const { data: dadosContas } = useContas();
  const criar = useCriarTransferencia();
  const enviandoRef = useRef(false);
  const timezone = perfil?.timezone ?? 'America/Sao_Paulo';

  useEffect(() => {
    if (criar.error) aplicarErrosDeCampo(criar.error, setError);
  }, [criar.error, setError]);

  const contas = dadosContas?.contas ?? [];
  const contasDestino = contas.filter((conta) => conta.id !== contaOrigemId);
  const contaOrigem = contas.find((conta) => conta.id === contaOrigemId);
  const contaDestino = contas.find((conta) => conta.id === contaDestinoId);

  const centavosValor = paraCentavos(valorSelecionado);
  const saldoDepoisOrigem = contaOrigem
    ? deCentavos(paraCentavos(contaOrigem.saldoAtual) - centavosValor)
    : null;
  const saldoDepoisDestino = contaDestino
    ? deCentavos(paraCentavos(contaDestino.saldoAtual) + centavosValor)
    : null;

  function aoMudarAberto(novoAberto: boolean): void {
    if (!novoAberto) {
      reset(valoresIniciais());
      aoFechar();
    }
  }

  function aoSubmeter(dados: TransferenciaFormulario): void {
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    criar.mutate(
      {
        contaOrigemId: dados.contaOrigemId,
        contaDestinoId: dados.contaDestinoId,
        valor: dados.valor,
        data: dados.data ?? '',
        descricao: dados.descricao,
      },
      {
        onSuccess: () => {
          aoMudarAberto(false);
        },
        onSettled: () => {
          enviandoRef.current = false;
        },
      },
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogConteudo aria-describedby={undefined}>
        <DialogTitulo>Nova transferência</DialogTitulo>

        <form
          noValidate
          onSubmit={(evento) => {
            void handleSubmit(aoSubmeter)(evento);
          }}
          className="mt-4 flex flex-col gap-4"
        >
          {criar.error ? (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-md bg-perigo/10 p-3 text-sm text-perigo"
            >
              {traduzirErroApi(criar.error)}
            </p>
          ) : null}

          <SelecionadorConta
            rotulo="Conta de origem"
            contas={contas}
            valor={contaOrigemId}
            aoAlterar={(contaId) => {
              setValue('contaOrigemId', contaId, { shouldValidate: true });
              if (contaId === contaDestinoId) setValue('contaDestinoId', '');
            }}
            erro={errors.contaOrigemId?.message}
          />
          {contaOrigem ? (
            <p className="text-sm text-textoSuave">
              Saldo atual: {formatarMoeda(contaOrigem.saldoAtual)}
              {saldoDepoisOrigem ? ` → depois: ${formatarMoeda(saldoDepoisOrigem)}` : ''}
            </p>
          ) : null}

          <SelecionadorConta
            rotulo="Conta de destino"
            contas={contasDestino}
            valor={contaDestinoId}
            aoAlterar={(contaId) => {
              setValue('contaDestinoId', contaId, { shouldValidate: true });
            }}
            erro={errors.contaDestinoId?.message}
          />
          {contaDestino ? (
            <p className="text-sm text-textoSuave">
              Saldo atual: {formatarMoeda(contaDestino.saldoAtual)}
              {saldoDepoisDestino ? ` → depois: ${formatarMoeda(saldoDepoisDestino)}` : ''}
            </p>
          ) : null}

          <CampoMoeda
            rotulo="Valor"
            valor={valorSelecionado}
            aoAlterar={(valor) => {
              setValue('valor', valor, { shouldValidate: true });
            }}
            erro={errors.valor?.message}
          />

          <CampoData
            rotulo="Data"
            valor={dataSelecionada}
            aoAlterar={(dataIso) => {
              setValue('data', dataIso, { shouldValidate: true });
            }}
            timezone={timezone}
            erro={errors.data?.message}
          />

          <Campo
            rotulo="Descrição (opcional)"
            erro={errors.descricao?.message}
            {...register('descricao')}
          />

          <Botao type="submit" carregando={criar.isPending}>
            Transferir
          </Botao>
        </form>
      </DialogConteudo>
    </Dialog>
  );
}
