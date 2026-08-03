import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Botao } from '@/componentes/ui/Botao';
import { CaixaMarcacao } from '@/componentes/ui/CaixaMarcacao';
import { Campo } from '@/componentes/ui/Campo';
import { CampoSenha } from '@/componentes/ui/CampoSenha';
import { useLogin } from '@/hooks/useLogin';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { loginSchema } from '@/validadores/autenticacao.validador';
import type { LoginFormulario } from '@/validadores/autenticacao.validador';
import type { ReactElement } from 'react';

interface FormularioLoginProps {
  onSucesso: () => void;
  /** EMAIL_NAO_VERIFICADO tem tela propria de reenvio (issue #19) — nao e'
   * so mais um toast generico de erro. */
  onEmailNaoVerificado: (email: string) => void;
}

export function FormularioLogin({
  onSucesso,
  onEmailNaoVerificado,
}: FormularioLoginProps): ReactElement {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormulario>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '', lembrarMe: false },
  });

  const { mutate, isPending, error } = useLogin();
  // Guarda sincrona: dois cliques rapidos disparam handleSubmit duas vezes
  // ANTES do re-render que desabilita o botao (isPending so reflete no
  // proximo render) — sem isto, ambos passam a validacao e chamam mutate.
  const enviandoRef = useRef(false);

  function aoSubmeter(dados: LoginFormulario): void {
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    mutate(dados, {
      onSuccess: onSucesso,
      onSettled: () => {
        enviandoRef.current = false;
      },
      onError: (erro) => {
        if (erro.codigo === 'EMAIL_NAO_VERIFICADO') {
          onEmailNaoVerificado(getValues('email'));
        }
      },
    });
  }

  const mostrarErroGeral = error && error.codigo !== 'EMAIL_NAO_VERIFICADO';

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        void handleSubmit(aoSubmeter)(evento);
      }}
      className="flex flex-col gap-4"
    >
      {mostrarErroGeral ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-md bg-perigo/10 p-3 text-sm text-perigo"
        >
          {traduzirErroApi(error)}
        </p>
      ) : null}

      <Campo
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        erro={errors.email?.message}
        {...register('email')}
      />
      <CampoSenha
        rotulo="Senha"
        autoComplete="current-password"
        erro={errors.senha?.message}
        {...register('senha')}
      />
      <CaixaMarcacao rotulo="Lembrar-me" {...register('lembrarMe')} />

      <Botao type="submit" carregando={isPending}>
        Entrar
      </Botao>
    </form>
  );
}
