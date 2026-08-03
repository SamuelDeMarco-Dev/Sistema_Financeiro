import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Botao } from '@/componentes/ui/Botao';
import { Campo } from '@/componentes/ui/Campo';
import { useEsqueciSenha } from '@/hooks/useEsqueciSenha';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { esqueciSenhaSchema } from '@/validadores/autenticacao.validador';
import type { EsqueciSenhaFormulario } from '@/validadores/autenticacao.validador';
import type { ReactElement } from 'react';

export function EsqueciSenha(): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EsqueciSenhaFormulario>({
    resolver: zodResolver(esqueciSenhaSchema),
    defaultValues: { email: '' },
  });

  const { mutate, isPending, isSuccess, error } = useEsqueciSenha();
  // Guarda sincrona contra duplo clique — ver FormularioLogin.tsx.
  const enviandoRef = useRef(false);
  const [emailEnviado, setEmailEnviado] = useState('');

  function aoSubmeter(dados: EsqueciSenhaFormulario): void {
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    mutate(dados.email, {
      onSuccess: () => {
        setEmailEnviado(dados.email);
      },
      onSettled: () => {
        enviandoRef.current = false;
      },
    });
  }

  if (isSuccess) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4 py-8 text-center">
        <h1 className="text-lg font-semibold text-texto">Verifique seu e-mail</h1>
        {/* Mensagem neutra de proposito (RF-07): nao revela se emailEnviado
            esta ou nao cadastrado — o backend sempre responde 200 igual. */}
        <p className="text-sm text-textoSuave">
          Se <strong className="text-texto">{emailEnviado}</strong> estiver cadastrado, você
          receberá um link para redefinir sua senha em instantes.
        </p>
        <Link to="/entrar" className="font-medium text-primaria hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-texto">Esqueci minha senha</h1>
        <p className="text-sm text-textoSuave">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>
      </div>

      <form
        noValidate
        onSubmit={(evento) => {
          void handleSubmit(aoSubmeter)(evento);
        }}
        className="flex flex-col gap-4"
      >
        {error ? (
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

        <Botao type="submit" carregando={isPending}>
          Enviar link
        </Botao>
      </form>

      <p className="text-center text-sm text-textoSuave">
        Lembrou a senha?{' '}
        <Link to="/entrar" className="font-medium text-primaria hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
