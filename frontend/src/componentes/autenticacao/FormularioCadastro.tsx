import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Botao } from '@/componentes/ui/Botao';
import { Campo } from '@/componentes/ui/Campo';
import { CampoSenha } from '@/componentes/ui/CampoSenha';
import { useCadastro } from '@/hooks/useCadastro';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { cadastroSchema } from '@/validadores/autenticacao.validador';
import type { CadastroFormulario } from '@/validadores/autenticacao.validador';
import { IndicadorForcaSenha } from './IndicadorForcaSenha';
import type { ReactElement } from 'react';

interface FormularioCadastroProps {
  onSucesso: (email: string) => void;
}

export function FormularioCadastro({ onSucesso }: FormularioCadastroProps): ReactElement {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CadastroFormulario>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { nome: '', email: '', senha: '', confirmacaoSenha: '' },
  });

  const { mutate, isPending, error } = useCadastro();
  // useWatch (nao methods.watch()) — a funcao watch() nao e memoizavel de
  // forma segura e o React Compiler pula a otimizacao do componente
  // inteiro quando detecta o uso dela (react-hooks/incompatible-library).
  const senha = useWatch({ control, name: 'senha' });
  // Guarda sincrona: ver o mesmo comentario em FormularioLogin.tsx.
  const enviandoRef = useRef(false);

  function aoSubmeter(dados: CadastroFormulario): void {
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    mutate(dados, {
      onSuccess: () => {
        onSucesso(dados.email);
      },
      onSettled: () => {
        enviandoRef.current = false;
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
        rotulo="Nome"
        type="text"
        autoComplete="name"
        erro={errors.nome?.message}
        {...register('nome')}
      />
      <Campo
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        erro={errors.email?.message}
        {...register('email')}
      />
      <div className="flex flex-col gap-2">
        <CampoSenha
          rotulo="Senha"
          autoComplete="new-password"
          erro={errors.senha?.message}
          {...register('senha')}
        />
        <IndicadorForcaSenha senha={senha} />
      </div>
      <CampoSenha
        rotulo="Confirmar senha"
        autoComplete="new-password"
        erro={errors.confirmacaoSenha?.message}
        {...register('confirmacaoSenha')}
      />

      <Botao type="submit" carregando={isPending}>
        Criar conta
      </Botao>
    </form>
  );
}
