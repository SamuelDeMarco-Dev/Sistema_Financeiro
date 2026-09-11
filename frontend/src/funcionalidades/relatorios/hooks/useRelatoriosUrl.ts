import { useSearchParams } from 'react-router-dom';

export const ABAS_RELATORIO = [
  'MENSAL',
  'ANUAL',
  'POR_CATEGORIA',
  'POR_CONTA',
  'FLUXO_CAIXA',
] as const;
export type AbaRelatorio = (typeof ABAS_RELATORIO)[number];

export const ROTULO_ABA_RELATORIO: Record<AbaRelatorio, string> = {
  MENSAL: 'Mensal',
  ANUAL: 'Anual',
  POR_CATEGORIA: 'Por categoria',
  POR_CONTA: 'Por conta',
  FLUXO_CAIXA: 'Fluxo de caixa',
};

interface EstadoRelatoriosUrl {
  aba: AbaRelatorio;
  ano: number;
  mes: number;
}

interface ResultadoRelatoriosUrl extends EstadoRelatoriosUrl {
  definirAba: (aba: AbaRelatorio) => void;
  definirAno: (ano: number) => void;
  definirMes: (mes: number) => void;
}

function ehAbaValida(valor: string | null): valor is AbaRelatorio {
  return valor !== null && (ABAS_RELATORIO as readonly string[]).includes(valor);
}

/** RF-72 a RF-74: aba + período (ano/mes, compartilhado por todas as
 * abas) vivem na URL — trocar de aba preserva o período (o estado é um
 * só; cada aba so interpreta `ano`/`mes` do seu jeito, derivando
 * dataInicio/dataFim quando precisa de período livre). */
export function useRelatoriosUrl(hoje: { ano: number; mes: number }): ResultadoRelatoriosUrl {
  const [searchParams, setSearchParams] = useSearchParams();

  const abaParam = searchParams.get('aba');
  const anoParam = Number(searchParams.get('ano'));
  const mesParam = Number(searchParams.get('mes'));

  const aba = ehAbaValida(abaParam) ? abaParam : 'MENSAL';
  const ano =
    Number.isInteger(anoParam) && anoParam >= 2000 && anoParam <= 2100 ? anoParam : hoje.ano;
  const mes = Number.isInteger(mesParam) && mesParam >= 1 && mesParam <= 12 ? mesParam : hoje.mes;

  function atualizar(parcial: Partial<EstadoRelatoriosUrl>): void {
    const proximo = { aba, ano, mes, ...parcial };
    setSearchParams({
      aba: proximo.aba,
      ano: String(proximo.ano),
      mes: String(proximo.mes),
    });
  }

  return {
    aba,
    ano,
    mes,
    definirAba: (novaAba) => {
      atualizar({ aba: novaAba });
    },
    definirAno: (novoAno) => {
      atualizar({ ano: novoAno });
    },
    definirMes: (novoMes) => {
      const novoAno = ano + Math.floor((novoMes - 1) / 12);
      const mesNormalizado = ((((novoMes - 1) % 12) + 12) % 12) + 1;
      atualizar({ ano: novoAno, mes: mesNormalizado });
    },
  };
}
