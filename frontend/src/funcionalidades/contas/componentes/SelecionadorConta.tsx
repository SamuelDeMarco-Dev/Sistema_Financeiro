import { createElement } from 'react';
import {
  Select,
  SelectConteudo,
  SelectGatilho,
  SelectGrupo,
  SelectItem,
  SelectRotuloGrupo,
  SelectValor,
} from '@/componentes/ui/Select';
import { resolverIcone } from '@/constantes/icones';
import { formatarMoeda } from '@/utilitarios/formatadores';
import type { Conta } from '../tipos/conta';
import type { ReactElement } from 'react';

interface SelecionadorContaProps {
  rotulo: string;
  contas: Conta[];
  valor: string;
  aoAlterar: (contaId: string) => void;
  erro?: string | undefined;
  id?: string;
}

interface GrupoContas {
  chave: string;
  rotulo: string;
  contas: Conta[];
}

// Agrupa por escopo (pessoal/grupo) — M2 so tem escopo PESSOAL ativo, mas a
// estrutura ja fica pronta para quando M6 trouxer contas compartilhadas
// (varios grupos, cada um com seu proprio rotulo de escopo.nome).
function agruparPorEscopo(contas: Conta[]): GrupoContas[] {
  const grupos = new Map<string, GrupoContas>();
  for (const conta of contas) {
    const chave = `${conta.escopo.tipo}:${conta.escopo.id}`;
    const rotulo = conta.escopo.tipo === 'PESSOAL' ? 'Pessoal' : conta.escopo.nome;
    const grupo = grupos.get(chave);
    if (grupo) grupo.contas.push(conta);
    else grupos.set(chave, { chave, rotulo, contas: [conta] });
  }
  return [...grupos.values()];
}

function ConteudoItemConta({ conta }: { conta: Conta }): ReactElement {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `${conta.cor}1A`, color: conta.cor }}
      >
        {/* resolverIcone + createElement: mesmo motivo de CartaoConta —
            evita o falso-positivo de react-hooks/static-components. */}
        {createElement(resolverIcone(conta.icone), {
          className: 'h-3.5 w-3.5',
          'aria-hidden': true,
        })}
      </span>
      <span className="min-w-0 flex-1 truncate">{conta.nome}</span>
      <span className="shrink-0 font-mono text-xs tabular-nums text-textoSuave">
        {formatarMoeda(conta.saldoAtual)}
      </span>
    </span>
  );
}

/** #30: seletor de conta reutilizavel para os formularios de movimentacao
 * (M3+) — mostra icone, cor e saldo atual de cada conta, agrupadas por
 * escopo pessoal/grupo. Contas arquivadas nao aparecem: nao fazem sentido
 * como destino de uma movimentacao nova. */
export function SelecionadorConta({
  rotulo,
  contas,
  valor,
  aoAlterar,
  erro,
  id,
}: SelecionadorContaProps): ReactElement {
  const contasAtivas = contas.filter((conta) => !conta.arquivada);
  const grupos = agruparPorEscopo(contasAtivas);
  const contaSelecionada = contasAtivas.find((conta) => conta.id === valor);
  const idErro = id ? `${id}-erro` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-texto" id={id ? `${id}-rotulo` : undefined}>
        {rotulo}
      </span>
      <Select value={valor} onValueChange={aoAlterar}>
        <SelectGatilho
          id={id}
          aria-labelledby={id ? `${id}-rotulo` : undefined}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
        >
          <SelectValor placeholder="Selecione uma conta">
            {contaSelecionada ? <ConteudoItemConta conta={contaSelecionada} /> : null}
          </SelectValor>
        </SelectGatilho>
        <SelectConteudo>
          {grupos.length === 0 ? (
            <p className="px-2 py-2 text-sm text-textoSuave">Nenhuma conta disponivel.</p>
          ) : null}
          {grupos.map((grupo) => (
            <SelectGrupo key={grupo.chave}>
              <SelectRotuloGrupo>{grupo.rotulo}</SelectRotuloGrupo>
              {grupo.contas.map((conta) => (
                <SelectItem key={conta.id} value={conta.id}>
                  <ConteudoItemConta conta={conta} />
                </SelectItem>
              ))}
            </SelectGrupo>
          ))}
        </SelectConteudo>
      </Select>
      {erro ? (
        <p id={idErro} role="alert" aria-live="polite" className="text-sm text-perigo">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
