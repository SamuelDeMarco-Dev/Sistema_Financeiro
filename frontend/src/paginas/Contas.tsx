import { useState } from 'react';
import { Esqueleto, EstadoErro, EstadoVazio } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { CartaoSaldoTotal } from '@/funcionalidades/contas/componentes/CartaoSaldoTotal';
import { DialogoExcluirConta } from '@/funcionalidades/contas/componentes/DialogoExcluirConta';
import { FormularioConta } from '@/funcionalidades/contas/componentes/FormularioConta';
import { GradeContas } from '@/funcionalidades/contas/componentes/GradeContas';
import { SecaoContasArquivadas } from '@/funcionalidades/contas/componentes/SecaoContasArquivadas';
import { useArquivarConta } from '@/funcionalidades/contas/hooks/useArquivarConta';
import { useContas } from '@/funcionalidades/contas/hooks/useContas';
import { useDesarquivarConta } from '@/funcionalidades/contas/hooks/useDesarquivarConta';
import { useReordenarContas } from '@/funcionalidades/contas/hooks/useReordenarContas';
import type { Conta } from '@/funcionalidades/contas/tipos/conta';
import type { ReactElement } from 'react';

function EsqueletoGradeContas(): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: 4 }, (_, indice) => (
        <Esqueleto key={indice} className="h-28 w-full" />
      ))}
    </div>
  );
}

export function Contas(): ReactElement {
  const { data, isLoading, isError, refetch } = useContas();
  const reordenar = useReordenarContas();
  const arquivar = useArquivarConta();
  const desarquivar = useDesarquivarConta();

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [contaEmEdicao, setContaEmEdicao] = useState<Conta | undefined>(undefined);
  const [contaParaExcluir, setContaParaExcluir] = useState<Conta | null>(null);

  function abrirCriacao(): void {
    setContaEmEdicao(undefined);
    setFormularioAberto(true);
  }

  function abrirEdicao(conta: Conta): void {
    setContaEmEdicao(conta);
    setFormularioAberto(true);
  }

  const contas = data?.contas ?? [];
  const ativas = contas.filter((conta) => !conta.arquivada);
  const arquivadas = contas.filter((conta) => conta.arquivada);
  const semNenhumaConta = !isLoading && !isError && contas.length === 0;

  return (
    <div className="mx-auto flex min-w-0 max-w-[1440px] flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-texto">Contas</h1>
        <Botao onClick={abrirCriacao}>Nova conta</Botao>
      </header>

      {isLoading ? <EsqueletoGradeContas /> : null}

      {isError ? (
        <EstadoErro
          mensagem="Não foi possível carregar suas contas."
          onTentarNovamente={() => {
            void refetch();
          }}
        />
      ) : null}

      {semNenhumaConta ? (
        <EstadoVazio
          titulo="Nenhuma conta ainda"
          descricao="Crie sua primeira conta para começar a acompanhar seu saldo."
          acao={{ rotulo: 'Nova conta', onClick: abrirCriacao }}
        />
      ) : null}

      {data && contas.length > 0 ? (
        <>
          <CartaoSaldoTotal
            saldoTotal={data.totalizadores.saldoTotal}
            quantidadeContas={data.totalizadores.quantidadeContas}
          />

          {ativas.length > 0 ? (
            <GradeContas
              contas={ativas}
              onReordenar={(ordens) => {
                reordenar.mutate(ordens);
              }}
              onEditar={abrirEdicao}
              onArquivar={(id) => {
                arquivar.mutate(id);
              }}
              onDesarquivar={(id) => {
                desarquivar.mutate(id);
              }}
              onExcluir={setContaParaExcluir}
            />
          ) : (
            <p className="text-sm text-textoSuave">Todas as contas estão arquivadas.</p>
          )}

          <SecaoContasArquivadas
            contas={arquivadas}
            onEditar={abrirEdicao}
            onDesarquivar={(id) => {
              desarquivar.mutate(id);
            }}
            onExcluir={setContaParaExcluir}
          />
        </>
      ) : null}

      <FormularioConta
        aberto={formularioAberto}
        aoFechar={() => {
          setFormularioAberto(false);
        }}
        conta={contaEmEdicao}
      />
      <DialogoExcluirConta
        conta={contaParaExcluir}
        aoFechar={() => {
          setContaParaExcluir(null);
        }}
      />
    </div>
  );
}
