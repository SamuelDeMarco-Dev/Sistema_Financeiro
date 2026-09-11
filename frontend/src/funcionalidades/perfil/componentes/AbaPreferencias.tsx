import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { notificar } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { CaixaMarcacao } from '@/componentes/ui/CaixaMarcacao';
import { Selecao } from '@/componentes/ui/Selecao';
import { TEMAS, useTema } from '@/contextos/ContextoTema';
import type { Tema } from '@/contextos/ContextoTema';
import { useAtualizarPerfil } from '@/funcionalidades/perfil/hooks/useAtualizarPerfil';
import { preferenciasSchema } from '@/funcionalidades/perfil/schemas/perfil.schema';
import type { PreferenciasFormulario } from '@/funcionalidades/perfil/schemas/perfil.schema';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import {
  obterOpcoesDiaSemana,
  obterOpcoesFormatoData,
  obterOpcoesMoeda,
  obterOpcoesTimezone,
} from '@/utilitarios/opcoes-preferencias';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import type { ReactElement } from 'react';

interface AbaPreferenciasProps {
  perfil: PerfilCompleto;
}

const ROTULOS_TEMA: Record<Tema, string> = {
  CLARO: 'Claro',
  ESCURO: 'Escuro',
  SISTEMA: 'Sistema',
};

export function AbaPreferencias({ perfil }: AbaPreferenciasProps): ReactElement {
  const { tema: temaAtual, definirTema } = useTema();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PreferenciasFormulario>({
    resolver: zodResolver(preferenciasSchema),
    defaultValues: {
      // tema vem do ContextoTema (fonte local que realmente aplica o
      // visual), nao de perfil.tema — os dois podem divergir se o
      // usuario trocou de tema em outro dispositivo desde o ultimo boot.
      tema: temaAtual,
      idioma: perfil.idioma,
      moedaPadrao: perfil.moedaPadrao,
      timezone: perfil.timezone,
      formatoData: perfil.formatoData,
      primeiroDiaSemana: perfil.primeiroDiaSemana,
      notificacoesApp: perfil.notificacoesApp,
      notificacoesEmail: perfil.notificacoesEmail,
    },
  });

  const { mutate, isPending } = useAtualizarPerfil();

  function aoSalvar(dados: PreferenciasFormulario): void {
    mutate(dados, {
      onSuccess: () => {
        definirTema(dados.tema);
        notificar.sucesso('Preferências atualizadas.');
      },
      onError: (erro) => {
        notificar.erro(traduzirErroApi(erro));
      },
    });
  }

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        void handleSubmit(aoSalvar)(evento);
      }}
      className="flex flex-col gap-4"
    >
      <Selecao rotulo="Tema" erro={errors.tema?.message} {...register('tema')}>
        {TEMAS.map((opcao) => (
          <option key={opcao} value={opcao}>
            {ROTULOS_TEMA[opcao]}
          </option>
        ))}
      </Selecao>

      <Selecao rotulo="Idioma" erro={errors.idioma?.message} {...register('idioma')}>
        <option value="pt-BR">Português (Brasil)</option>
      </Selecao>

      <Selecao
        rotulo="Moeda padrão"
        erro={errors.moedaPadrao?.message}
        {...register('moedaPadrao')}
      >
        {obterOpcoesMoeda().map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </Selecao>

      <Selecao rotulo="Fuso horário" erro={errors.timezone?.message} {...register('timezone')}>
        {obterOpcoesTimezone().map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </Selecao>

      <Selecao
        rotulo="Formato de data"
        erro={errors.formatoData?.message}
        {...register('formatoData')}
      >
        {obterOpcoesFormatoData().map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </Selecao>

      <Selecao
        rotulo="Primeiro dia da semana"
        erro={errors.primeiroDiaSemana?.message}
        {...register('primeiroDiaSemana', { valueAsNumber: true })}
      >
        {obterOpcoesDiaSemana().map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </Selecao>

      <CaixaMarcacao rotulo="Notificações no aplicativo" {...register('notificacoesApp')} />
      <CaixaMarcacao rotulo="Notificações por e-mail" {...register('notificacoesEmail')} />

      <div>
        <Botao type="submit" carregando={isPending}>
          Salvar preferências
        </Botao>
      </div>
    </form>
  );
}
