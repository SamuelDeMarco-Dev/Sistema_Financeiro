import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const API = process.env.E2E_URL_API ?? 'http://localhost:3333/api/v1';
const MAILPIT = process.env.E2E_URL_MAILPIT ?? 'http://localhost:8025';

export interface Usuario {
  nome: string;
  email: string;
  senha: string;
}

/** Senha que satisfaz RN-05 (maiúscula, minúscula, dígito e símbolo). */
const SENHA = 'Senha!Forte123';

interface MensagemMailpit {
  ID: string;
  To: { Address: string }[];
  Subject: string;
}

async function jsonMailpit<T>(rota: string): Promise<T> {
  const resposta = await fetch(`${MAILPIT}${rota}`);
  if (!resposta.ok) {
    throw new Error(`Mailpit respondeu ${resposta.status} em ${rota}. O contêiner está de pé?`);
  }
  return (await resposta.json()) as T;
}

/** Procura o e-mail mais recente enviado ao destinatário e devolve o corpo.
 * Repete porque o envio é assíncrono no backend: a resposta da API volta
 * antes de o SMTP entregar. */
export async function aguardarEmail(destinatario: string, assuntoParcial: string): Promise<string> {
  const limite = Date.now() + 15_000;

  while (Date.now() < limite) {
    const { messages } = await jsonMailpit<{ messages: MensagemMailpit[] }>(
      '/api/v1/messages?limit=50',
    );
    const alvo = messages.find(
      (mensagem) =>
        mensagem.To.some((para) => para.Address === destinatario) &&
        mensagem.Subject.toLocaleLowerCase('pt-BR').includes(
          assuntoParcial.toLocaleLowerCase('pt-BR'),
        ),
    );

    if (alvo) {
      const corpo = await jsonMailpit<{ HTML?: string; Text?: string }>(
        `/api/v1/message/${alvo.ID}`,
      );
      return `${corpo.HTML ?? ''}\n${corpo.Text ?? ''}`;
    }

    await new Promise((resolver) => setTimeout(resolver, 500));
  }

  throw new Error(`Nenhum e-mail com assunto "${assuntoParcial}" chegou para ${destinatario}.`);
}

export function extrairLink(corpo: string, caminho: string): string {
  const achado = new RegExp(`https?://[^"'\\s<>]*${caminho}[^"'\\s<>]*`).exec(corpo);
  if (!achado) {
    throw new Error(`O e-mail não traz um link para ${caminho}.`);
  }
  return achado[0];
}

/** Cadastra e ativa um usuário. Preparação de cenário, não o que se verifica
 * aqui: o cadastro e a confirmação vão pela API, mas o **token sai do e-mail
 * real** entregue no Mailpit — nada de escrever no banco por fora, e o fluxo
 * de e-mail continua sendo exercitado de ponta a ponta.
 *
 * A tela `/verificar-email` de propósito não entra no caminho: em modo de
 * desenvolvimento o `StrictMode` invoca o efeito duas vezes e a página fica
 * presa em "Verificando seu e-mail...", ainda que a requisição volte 200
 * (medido; no build de produção a mesma tela funciona). Fazer este cenário
 * depender dela seria acoplá-lo a um artefato do servidor de desenvolvimento.
 * Esse fluxo é do escopo da issue #19, e é lá que a tela deve ser corrigida. */
export async function criarUsuarioAtivo(nome: string): Promise<Usuario> {
  // Um e-mail novo por execução: RN-04 recusa duplicados, e o limitador de
  // login é por e-mail.
  const email = `e2e.${nome.toLowerCase().replace(/\s+/g, '-')}.${Date.now()}@exemplo.com`;
  const usuario: Usuario = { nome, email, senha: SENHA };

  const resposta = await fetch(`${API}/autenticacao/cadastrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...usuario, confirmacaoSenha: SENHA, aceitouTermos: true }),
  });
  if (!resposta.ok) {
    throw new Error(`Cadastro de ${email} falhou: ${resposta.status} ${await resposta.text()}`);
  }

  const corpo = await aguardarEmail(email, 'confirme');
  const token = new URL(extrairLink(corpo, '/verificar-email')).searchParams.get('token');
  if (!token) {
    throw new Error('O link de verificação chegou sem token.');
  }

  const verificacao = await fetch(`${API}/autenticacao/verificar-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!verificacao.ok) {
    throw new Error(`Verificação de ${email} falhou: ${verificacao.status}`);
  }

  return usuario;
}

export async function entrar(pagina: Page, usuario: Usuario): Promise<void> {
  await pagina.goto('/entrar');
  await pagina.getByLabel('E-mail').fill(usuario.email);
  await pagina.getByLabel('Senha', { exact: true }).fill(usuario.senha);
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  await expect(pagina.getByRole('link', { name: 'Compartilhadas' }).first()).toBeVisible();
}

/** Navega pela interface, e não por `goto`: recarregar a página inteira
 * refaz a restauração de sessão, que tem limitador por IP (30/15 min) e
 * derrubaria o cenário no meio. */
export async function irParaCompartilhadas(pagina: Page): Promise<void> {
  await pagina.getByRole('link', { name: 'Compartilhadas' }).first().click();
  await expect(pagina.getByRole('heading', { name: 'Compartilhadas' })).toBeVisible();
}

/** Saldo do grupo lido do cabeçalho — a leitura que o usuário faz.
 *
 * O `Intl.NumberFormat` pt-BR separa símbolo e número com espaço rígido
 * (U+00A0), e em alguns runtimes com espaço estreito (U+202F). Normalizar
 * aqui é o que permite comparar com `'R$ 130,00'` escrito à mão sem esconder
 * diferença de valor — só de espaço. */
export async function saldoDoGrupo(pagina: Page): Promise<string> {
  const rotulo = pagina.getByText('Saldo do grupo');
  await expect(rotulo).toBeVisible();
  const valor = rotulo.locator('xpath=following-sibling::p[1]');
  return (await valor.innerText()).replace(/\s+/g, ' ').trim();
}
