import { prisma } from '@/banco/cliente';
import { ambiente } from '@/configuracao/ambiente';
import { criarServidor } from '@/servidor';

const app = criarServidor();

const servidor = app.listen(ambiente.PORTA, () => {
  // eslint-disable-next-line no-console -- ainda nao ha logger estruturado (issue #5)
  console.log(`API ouvindo em http://localhost:${ambiente.PORTA}`);
});

async function encerrarGraciosamente(sinal: NodeJS.Signals): Promise<void> {
  // eslint-disable-next-line no-console -- ainda nao ha logger estruturado (issue #5)
  console.log(`${sinal} recebido: encerrando requisicoes em curso...`);

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
