import { prisma } from '@/banco/cliente';
import { ambiente } from '@/configuracao/ambiente';
import { criarServidor } from '@/servidor';
import { registrador } from '@/utilitarios/registrador';

const app = criarServidor();

const servidor = app.listen(ambiente.PORTA, () => {
  registrador.info(`API ouvindo em http://localhost:${ambiente.PORTA}`);
});

async function encerrarGraciosamente(sinal: NodeJS.Signals): Promise<void> {
  registrador.info(`${sinal} recebido: encerrando requisicoes em curso...`);

  servidor.close(async (erro) => {
    await prisma.$disconnect();

    if (erro) {
      process.exitCode = 1;
    }

    process.exit();
  });
}

process.on('SIGTERM', encerrarGraciosamente);
process.on('SIGINT', encerrarGraciosamente);
