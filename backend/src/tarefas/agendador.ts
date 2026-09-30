import cron from 'node-cron';
import { ambiente } from '@/configuracao/ambiente';
import { gerarRecorrencias } from '@/tarefas/gerar-recorrencias.tarefa';
import { limparTokens } from '@/tarefas/limpar-tokens.tarefa';
import { marcarAtrasadas } from '@/tarefas/marcar-atrasadas.tarefa';

/** So registra os crons quando `HABILITAR_TAREFAS_AGENDADAS` e verdadeiro
 * e esta e a instancia "0" do cluster PM2 — sem isso, cada processo do
 * cluster rodaria a mesma tarefa, multiplicando o efeito (ex.: cada
 * processo gerando as mesmas ocorrencias de recorrencia). Fora de
 * cluster (dev, testes), `NODE_APP_INSTANCE` nao existe e o schema de
 * ambiente ja assume '0'. */
export function iniciarAgendador(): void {
  if (!ambiente.HABILITAR_TAREFAS_AGENDADAS) return;
  if (ambiente.NODE_APP_INSTANCE !== '0') return;

  cron.schedule('5 0 * * *', () => marcarAtrasadas(), { noOverlap: true });
  cron.schedule('15 0 * * *', () => gerarRecorrencias(), { noOverlap: true });
  cron.schedule('0 3 * * *', () => limparTokens(), { noOverlap: true });
}
