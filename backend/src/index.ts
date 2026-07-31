import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';

// TODO(#4): consumir a partir de `ambiente.PORTA` assim que a validacao de
// variaveis de ambiente existir.
const porta = Number(process.env['PORTA'] ?? 3333);

const app = criarServidor();

const servidor = app.listen(porta, () => {
  // eslint-disable-next-line no-console -- ainda nao ha logger estruturado (issue #5)
  console.log(`API ouvindo em http://localhost:${porta}`);
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
