import { prisma } from '@/banco/cliente';
import { ambiente } from '@/configuracao/ambiente';
import { criarServidor } from '@/servidor';
import { iniciarAgendador } from '@/tarefas/agendador';
import { registrador } from '@/utilitarios/registrador';

const app = criarServidor();

const servidor = app.listen(ambiente.PORTA, () => {
  registrador.info(`API ouvindo em http://localhost:${ambiente.PORTA}`);
});

iniciarAgendador();

function encerrarGraciosamente(sinal: NodeJS.Signals): void {
  registrador.info(`${sinal} recebido: encerrando requisicoes em curso...`);

  servidor.close((erro) => {
    if (erro) {
      process.exitCode = 1;
    }

    void prisma.$disconnect().finally(() => process.exit());
  });
}

process.on('SIGTERM', encerrarGraciosamente);
process.on('SIGINT', encerrarGraciosamente);
