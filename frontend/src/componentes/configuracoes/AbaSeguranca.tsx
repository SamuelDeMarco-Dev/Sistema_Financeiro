import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { notificar } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { CampoSenha } from '@/componentes/ui/CampoSenha';
import { useAlterarSenha } from '@/hooks/useAlterarSenha';
import { useRevogarSessao } from '@/hooks/useRevogarSessao';
import { useSessoesAtivas } from '@/hooks/useSessoesAtivas';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { alterarSenhaSchema } from '@/validadores/autenticacao.validador';
import type { AlterarSenhaFormulario } from '@/validadores/autenticacao.validador';
import type { ReactElement } from 'react';

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function FormularioAlterarSenha(): ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlterarSenhaFormulario>({
    resolver: zodResolver(alterarSenhaSchema),
    defaultValues: { senhaAtual: '', senhaNova: '', confirmacaoSenha: '' },
  });

  const { mutate, isPending } = useAlterarSenha();

  function aoSubmeter(dados: AlterarSenhaFormulario): void {
    mutate(dados, {
      onSuccess: () => {
        notificar.sucesso('Senha alterada. As demais sessões foram encerradas.');
        reset();
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
        void handleSubmit(aoSubmeter)(evento);
      }}
      className="flex flex-col gap-4"
    >
      <h2 className="text-sm font-medium text-texto">Alterar senha</h2>
      <CampoSenha
        rotulo="Senha atual"
        autoComplete="current-password"
        erro={errors.senhaAtual?.message}
        {...register('senhaAtual')}
      />
      <CampoSenha
        rotulo="Nova senha"
        autoComplete="new-password"
        erro={errors.senhaNova?.message}
        {...register('senhaNova')}
      />
      <CampoSenha
        rotulo="Confirmar nova senha"
        autoComplete="new-password"
        erro={errors.confirmacaoSenha?.message}
        {...register('confirmacaoSenha')}
      />
      <div>
        <Botao type="submit" carregando={isPending}>
          Alterar senha
        </Botao>
      </div>
    </form>
  );
}

function ListaSessoes(): ReactElement {
  const { data: sessoes, isLoading, isError } = useSessoesAtivas();
  const { mutate: revogar, isPending: revogando, variables: idRevogando } = useRevogarSessao();

  function aoRevogar(id: string): void {
    revogar(id, {
      onSuccess: () => {
        notificar.sucesso('Sessão encerrada.');
      },
      onError: (erro) => {
        notificar.erro(traduzirErroApi(erro));
      },
    });
  }

  if (isLoading) {
    return <p className="text-sm text-textoSuave">Carregando sessões...</p>;
  }

  if (isError) {
    return <p className="text-sm text-perigo">Não foi possível carregar as sessões ativas.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {(sessoes ?? []).map((sessao) => (
        <li
          key={sessao.id}
          className="flex items-center justify-between gap-3 rounded-md border border-borda bg-superficie p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-texto">
              {sessao.dispositivo}
              {sessao.atual ? (
                <span className="ml-2 rounded-full bg-primaria/10 px-2 py-0.5 text-xs font-semibold text-primaria">
                  Sessão atual
                </span>
              ) : null}
            </p>
            <p className="text-xs text-textoSuave">
              {sessao.ip} · desde {FORMATADOR_DATA.format(new Date(sessao.criadoEm))}
            </p>
          </div>
          {sessao.atual ? null : (
            <Botao
              variante="secundaria"
              carregando={revogando && idRevogando === sessao.id}
              onClick={() => {
                aoRevogar(sessao.id);
              }}
            >
              Revogar
            </Botao>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AbaSeguranca(): ReactElement {
  return (
    <div className="flex flex-col gap-8">
      <FormularioAlterarSenha />
      <section aria-labelledby="titulo-sessoes" className="flex flex-col gap-3">
        <h2 id="titulo-sessoes" className="text-sm font-medium text-texto">
          Sessões ativas
        </h2>
        <ListaSessoes />
      </section>
    </div>
  );
}
