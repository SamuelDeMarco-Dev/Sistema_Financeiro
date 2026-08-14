import { createElement, useState } from 'react';
import { EstadoVazio } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { resolverIcone } from '@/constantes/icones';
import { FormularioConta } from '@/funcionalidades/contas/componentes/FormularioConta';
import { paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import type { ContaCompartilhadaDetalhe } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface AbaContasGrupoProps {
  grupo: ContaCompartilhadaDetalhe;
}

/** RF-58: o grupo tem contas proprias. O detalhe do grupo (§16.3) ja
 * devolve as contas com saldo, entao esta aba nao faz requisicao propria.
 *
 * Criar a conta aqui, e nao em /contas: a rota exige o `contaCompartilhadaId`
 * e o papel ADMINISTRADOR (§10.2), e o lugar onde essa condicao e' legivel
 * e' dentro do grupo. `podeEditar` vem de `minhasPermissoes`, resolvido no
 * servidor — a decisao real continua sendo dele. */
export function AbaContasGrupo({ grupo }: AbaContasGrupoProps): ReactElement {
  const [formularioAberto, setFormularioAberto] = useState(false);
  const podeCriar = grupo.minhasPermissoes.podeEditar;

  function abrirCriacao(): void {
    setFormularioAberto(true);
  }

  const formulario = (
    <FormularioConta
      aberto={formularioAberto}
      contaCompartilhadaId={grupo.id}
      aoFechar={() => {
        setFormularioAberto(false);
      }}
    />
  );

  if (grupo.contas.length === 0) {
    return (
      <>
        <EstadoVazio
          titulo="Nenhuma conta neste grupo"
          descricao="Movimentações podem ser lançadas direto no grupo, mas uma conta ajuda a separar de onde o dinheiro sai e entra."
          {...(podeCriar && { acao: { rotulo: 'Nova conta do grupo', onClick: abrirCriacao } })}
        />
        {podeCriar ? formulario : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {podeCriar ? (
        <div className="flex justify-end">
          <Botao onClick={abrirCriacao}>Nova conta do grupo</Botao>
        </div>
      ) : null}

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {grupo.contas.map((conta) => {
          const saldoNegativo = paraCentavos(conta.saldoAtual) < 0;
          return (
            <li
              key={conta.id}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-borda bg-superficie p-4"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${conta.cor}1A`, color: conta.cor }}
              >
                {createElement(resolverIcone(conta.icone), {
                  className: 'h-5 w-5',
                  'aria-hidden': true,
                })}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-texto">{conta.nome}</p>
                <p
                  className={
                    saldoNegativo
                      ? 'font-mono text-lg font-semibold tabular-nums text-perigo'
                      : 'font-mono text-lg font-semibold tabular-nums text-texto'
                  }
                >
                  {formatarMoeda(conta.saldoAtual, grupo.moeda)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {podeCriar ? formulario : null}
    </div>
  );
}
