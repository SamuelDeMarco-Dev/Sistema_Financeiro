import { EstadoVazio } from '@/componentes/feedback';
import type { ReactElement } from 'react';

/** Placeholder deliberado: `GET /contas-compartilhadas/:id/auditoria`
 * (04-API.md §16.10) so ganha conteudo na M11, quando LogAuditoria passa
 * a ser gravado. A aba existe desde ja para o administrador saber que o
 * registro esta previsto — nao ha promessa de dado que nao temos. */
export function AbaAuditoriaGrupo(): ReactElement {
  return (
    <EstadoVazio
      titulo="Histórico de alterações"
      descricao="Quem mudou o quê no grupo passará a ser registrado aqui em uma versão futura."
    />
  );
}
