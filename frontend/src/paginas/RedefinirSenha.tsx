import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IndicadorForcaSenha } from '@/componentes/autenticacao/IndicadorForcaSenha';
import { notificar } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { CampoSenha } from '@/componentes/ui/CampoSenha';
import { useRedefinirSenha } from '@/hooks/useRedefinirSenha';
import { redefinirSenhaSchema } from '@/validadores/autenticacao.validador';
import type { RedefinirSenhaFormulario } from '@/validadores/autenticacao.validador';
import type { ReactElement } from 'react';

function LinkInvalido(): ReactElement {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4 py-8 text-center">
      <h1 className="text-lg font-semibold text-perigo">Link inválido ou expirado</h1>
      <p className="text-sm text-textoSuave">
        Este link de redefinição não é mais válido. Solicite um novo para continuar.
      </p>
      <Link to="/esqueci-senha" className="font-medium text-primaria hover:underline">
        Solicitar novo link
      </Link>
    </div>
  );
}

export function RedefinirSenha(): ReactElement {
  const [parametros] = useSearchParams();
  const token = parametros.get('token');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RedefinirSenhaFormulario>({
    resolver: zodResolver(redefinirSenhaSchema),
    defaultValues: { senha: '', confirmacaoSenha: '' },
  });

  const { mutate, isPending, isError } = useRedefinirSenha();
  // Guarda sincrona contra duplo clique — ver FormularioLogin.tsx.
  const enviandoRef = useRef(false);
  // useWatch (nao methods.watch()) — ver o mesmo comentario em FormularioCadastro.tsx.
  const senha = useWatch({ control, name: 'senha' });

  // Sem token na URL ou token rejeitado pelo backend (400 VALIDACAO —
  // invalido ou expirado): mesma tela de erro. O backend nao distingue
  // "token ruim" de outra falha de validacao com um codigo proprio, mas a
  // senha ja passou pelo mesmo schema no cliente, entao na pratica um erro
  // aqui so pode ser o token (RF-07).
  if (!token || isError) {
    return <LinkInvalido />;
  }

  function aoSubmeter(dados: RedefinirSenhaFormulario): void {
    if (enviandoRef.current || !token) return;
    enviandoRef.current = true;

    mutate(
      { token, senha: dados.senha, confirmacaoSenha: dados.confirmacaoSenha },
      {
        onSuccess: () => {
          // Todos os refresh tokens foram revogados no backend — a sessao
          // anterior (se havia) morreu, login e' obrigatorio (RF-07).
          notificar.sucesso('Senha redefinida com sucesso. Entre com sua nova senha.');
          void navigate('/entrar', { replace: true });
        },
        onSettled: () => {
          enviandoRef.current = false;
        },
      },
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-texto">Redefinir senha</h1>
        <p className="text-sm text-textoSuave">Escolha uma nova senha para sua conta.</p>
      </div>

      <form
        noValidate
        onSubmit={(evento) => {
          void handleSubmit(aoSubmeter)(evento);
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <CampoSenha
            rotulo="Nova senha"
            autoComplete="new-password"
            erro={errors.senha?.message}
            {...register('senha')}
          />
          <IndicadorForcaSenha senha={senha} />
        </div>
        <CampoSenha
          rotulo="Confirmar nova senha"
          autoComplete="new-password"
          erro={errors.confirmacaoSenha?.message}
          {...register('confirmacaoSenha')}
        />

        <Botao type="submit" carregando={isPending}>
          Redefinir senha
        </Botao>
      </form>
    </div>
  );
}
