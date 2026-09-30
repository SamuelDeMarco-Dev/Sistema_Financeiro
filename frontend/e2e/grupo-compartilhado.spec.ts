import { expect, test } from '@playwright/test';
import {
  aguardarEmail,
  criarUsuarioAtivo,
  entrar,
  extrairLink,
  irParaCompartilhadas,
  saldoDoGrupo,
} from './apoio/ambiente';
import type { Locator, Page } from '@playwright/test';

/** RF-53 a RF-60 — o cenário que define o produto: duas pessoas reais no
 * mesmo grupo, cada uma com o seu papel, e o saldo tendo de fechar dos dois
 * lados. Dois contextos de navegador simultâneos, porque metade dos defeitos
 * de escopo compartilhado só aparece quando as duas sessões existem ao mesmo
 * tempo.
 *
 * Depois do login, cada sessão navega só pela interface, sem recarregar a
 * página: em modo de desenvolvimento o `StrictMode` executa a restauração de
 * sessão duas vezes e, como o refresh token rotaciona a cada renovação, a
 * segunda chamada pode derrubar a sessão. Cada dado novo aparece aqui do jeito
 * que aparece para o usuário — por invalidação de cache depois de uma ação, ou
 * na primeira vez que a tela é aberta. */

const NOME_GRUPO = 'Casa E2E';
const NOME_CONTA = 'Caixa da Casa';

/** `CampoData` aceita 8 dígitos (ddmmaaaa); a data de hoje evita competência
 * em mês fechado. */
function hojeDigitado(): string {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  return `${dia}${mes}${String(hoje.getFullYear())}`;
}

async function abrirAba(pagina: Page, aba: string): Promise<void> {
  await pagina.getByRole('tab', { name: aba }).click();
  await expect(pagina.getByRole('tab', { name: aba })).toHaveAttribute('aria-selected', 'true');
}

/** Valor de um dos cartões de totalizadores da lista — leitura que vem da
 * mesma consulta das movimentações, e não do cabeçalho do grupo. */
function totalizador(pagina: Page, rotulo: string): Locator {
  return pagina.getByText(rotulo, { exact: true }).locator('xpath=following-sibling::p[1]');
}

/** `CampoMoeda` é máscara de calculadora: entram dígitos, o valor sai
 * formatado. "12000" ⇒ R$ 120,00. */
async function preencherDespesaEfetivada(
  dialogo: Locator,
  descricao: string,
  centavos: string,
): Promise<void> {
  await dialogo.getByRole('button', { name: 'Despesa' }).click();
  await dialogo.getByLabel('Descrição', { exact: true }).fill(descricao);
  await dialogo.getByLabel('Valor', { exact: true }).fill(centavos);
  await dialogo.getByLabel('Data de competência', { exact: true }).fill(hojeDigitado());
  await dialogo.getByLabel('Conta', { exact: true }).selectOption({ label: NOME_CONTA });

  // A categoria é obrigatória e o seletor abre num popover fora do diálogo —
  // daí a busca sair da página, e escopada ao listbox: o `<option>` nativo do
  // seletor de conta também tem papel `option`. Qualquer categoria de despesa
  // serve; o que este cenário verifica é escopo, não taxonomia.
  const pagina = dialogo.page();
  await dialogo.getByRole('combobox', { name: 'Categoria' }).click();
  await pagina.getByRole('listbox', { name: 'Categoria' }).getByRole('option').first().click();

  await dialogo.getByLabel('Situação', { exact: true }).selectOption('PAGA');
  // RN-12: efetivada exige data de efetivação.
  await dialogo.getByLabel('Data de efetivação', { exact: true }).fill(hojeDigitado());
  await dialogo.getByRole('button', { name: 'Criar movimentação' }).click();
}

test.describe('grupo compartilhado', () => {
  test('duas pessoas, um grupo: convite, lançamento, papéis e transferência', async ({
    browser,
  }) => {
    const contextoA = await browser.newContext();
    const contextoB = await browser.newContext();
    const paginaA = await contextoA.newPage();
    const paginaB = await contextoB.newPage();

    const [usuarioA, usuarioB] = await Promise.all([
      criarUsuarioAtivo('Ana'),
      criarUsuarioAtivo('Bruno'),
    ]);

    await entrar(paginaA, usuarioA);

    await test.step('A cria o grupo', async () => {
      await irParaCompartilhadas(paginaA);
      await paginaA.getByRole('button', { name: 'Novo grupo' }).click();
      await paginaA.getByLabel('Nome', { exact: true }).fill(NOME_GRUPO);
      await paginaA.getByRole('button', { name: 'Criar grupo' }).click();
      await expect(paginaA.getByRole('heading', { name: NOME_GRUPO })).toBeVisible();
      // Grupo recém-criado não tem movimentação: saldo zero é a única
      // resposta correta.
      expect(await saldoDoGrupo(paginaA)).toBe('R$ 0,00');
    });

    await test.step('A cria a conta do grupo', async () => {
      await abrirAba(paginaA, 'Contas');
      await paginaA.getByRole('button', { name: 'Nova conta do grupo' }).click();
      const dialogo = paginaA.getByRole('dialog');
      await dialogo.getByLabel('Nome', { exact: true }).fill(NOME_CONTA);
      await dialogo.getByLabel('Saldo inicial', { exact: true }).fill('30000');
      await dialogo.getByRole('button', { name: 'Criar conta' }).click();

      await expect(paginaA.getByText(NOME_CONTA)).toBeVisible();
      // O saldo inicial da conta entra no saldo do grupo (RF-58).
      await expect(async () => {
        expect(await saldoDoGrupo(paginaA)).toBe('R$ 300,00');
      }).toPass();
    });

    await test.step('A convida B', async () => {
      await abrirAba(paginaA, 'Membros');
      await paginaA.getByRole('button', { name: 'Convidar membro' }).click();
      const dialogo = paginaA.getByRole('dialog');
      await dialogo.getByLabel('E-mail', { exact: true }).fill(usuarioB.email);
      await dialogo.getByLabel('Papel no grupo', { exact: true }).selectOption('PARTICIPANTE');
      await dialogo.getByRole('button', { name: 'Enviar convite' }).click();

      const pendentes = paginaA.getByLabel('Convites enviados');
      await expect(pendentes).toContainText(usuarioB.email);
      await expect(pendentes).toContainText('Expira em 7 dias');
    });

    await test.step('o link do e-mail abre sem sessão e não expõe dinheiro', async () => {
      const corpo = await aguardarEmail(usuarioB.email, 'convidou');

      // Contexto anônimo: é como o convidado chega, e é o que prova que a
      // prévia é pública (§17.3).
      const contextoAnonimo = await browser.newContext();
      const paginaAnonima = await contextoAnonimo.newPage();
      await paginaAnonima.goto(extrairLink(corpo, '/convites/'));

      await expect(paginaAnonima.getByRole('heading', { name: NOME_GRUPO })).toBeVisible();
      await expect(paginaAnonima.getByText(usuarioA.nome)).toBeVisible();
      await expect(paginaAnonima.getByText('Participante')).toBeVisible();
      // Nenhum valor, e o e-mail do convidado chega mascarado pelo servidor.
      await expect(paginaAnonima.locator('body')).not.toContainText('R$');
      await expect(paginaAnonima.locator('body')).not.toContainText(usuarioB.email);
      await expect(paginaAnonima.getByRole('link', { name: 'Entrar para aceitar' })).toBeVisible();

      await contextoAnonimo.close();
    });

    await test.step('B aceita o convite', async () => {
      // B entra depois do convite enviado, como quem abre o app ao receber o
      // e-mail: a sessao comeca com as consultas frescas, sem cache anterior
      // ao convite.
      await entrar(paginaB, usuarioB);
      await irParaCompartilhadas(paginaB);
      await paginaB.getByRole('button', { name: 'Aceitar' }).click();
      await expect(paginaB.getByText(new RegExp(`faz parte de "${NOME_GRUPO}"`))).toBeVisible();
    });

    await test.step('B entra no grupo e vê o saldo que A montou', async () => {
      await paginaB.getByRole('link', { name: NOME_GRUPO }).click();
      await expect(paginaB.getByRole('heading', { name: NOME_GRUPO })).toBeVisible();
      expect(await saldoDoGrupo(paginaB)).toBe('R$ 300,00');
    });

    await test.step('B lança uma despesa efetivada', async () => {
      // Duas ocorrências enquanto a lista está vazia: o botão do cabeçalho e
      // o do estado vazio.
      await paginaB.getByRole('button', { name: 'Nova movimentação' }).first().click();
      await preencherDespesaEfetivada(paginaB.getByRole('dialog'), 'Mercado do Bruno', '12000');

      await expect(paginaB.getByText('Mercado do Bruno').first()).toBeVisible();
      // 300,00 - 120,00: despesa efetivada muda o saldo do grupo na hora.
      await expect(async () => {
        expect(await saldoDoGrupo(paginaB)).toBe('R$ 180,00');
      }).toPass();
    });

    await test.step('A lança a própria despesa e vê a de B, com autor e saldo', async () => {
      // A abriu o grupo antes de B lançar, então a lista dela está em cache.
      // Quem a atualiza é a própria ação de A — o mesmo caminho de qualquer
      // usuário: lança e a tela se refaz.
      await abrirAba(paginaA, 'Movimentações');
      await paginaA.getByRole('button', { name: 'Nova movimentação' }).first().click();
      await preencherDespesaEfetivada(paginaA.getByRole('dialog'), 'Mercado da Ana', '5000');

      await expect(paginaA.getByText('Mercado da Ana').first()).toBeVisible();
      await expect(paginaA.getByText('Mercado do Bruno').first()).toBeVisible();
      // RF-59: o autor aparece em cada movimentação do grupo.
      await expect(paginaA.getByText(usuarioB.nome).first()).toBeVisible();
      await expect(totalizador(paginaA, 'Despesas')).toHaveText(/170,00/);

      // 300,00 - 120,00 - 50,00.
      await expect(async () => {
        expect(await saldoDoGrupo(paginaA)).toBe('R$ 130,00');
      }).toPass();
    });

    await test.step('B edita o próprio lançamento, mas não tem ação no de A', async () => {
      // Editar o próprio lançamento é o lado positivo de RN-31 — e é a ação
      // de B que traz a lista atualizada, com o lançamento de A dentro.
      await paginaB.getByRole('button', { name: 'Ações para Mercado do Bruno' }).click();
      await paginaB.getByText('Editar').click();
      const dialogo = paginaB.getByRole('dialog');
      await dialogo.getByLabel('Descrição', { exact: true }).fill('Mercado do Bruno (revisado)');
      await dialogo.getByRole('button', { name: 'Salvar alterações' }).click();
      await expect(paginaB.getByText('Mercado do Bruno (revisado)').first()).toBeVisible();

      await expect(paginaB.getByText('Mercado da Ana').first()).toBeVisible();
      // A interface não oferece ação no lançamento de terceiro — nem
      // escondida atrás do menu.
      await expect(paginaB.getByRole('button', { name: 'Ações para Mercado da Ana' })).toHaveCount(
        0,
      );
      await expect(
        paginaB.getByRole('button', { name: 'Ações para Mercado do Bruno (revisado)' }),
      ).toBeVisible();

      // Só a descrição mudou: o saldo continua o mesmo dos dois lados.
      await expect(async () => {
        expect(await saldoDoGrupo(paginaB)).toBe('R$ 130,00');
      }).toPass();
    });

    await test.step('A tenta sair antes de transferir e recebe o aviso', async () => {
      await abrirAba(paginaA, 'Membros');
      await paginaA.getByRole('button', { name: 'Sair do grupo' }).click();

      const dialogo = paginaA.getByRole('dialog');
      await expect(dialogo).toContainText('não pode ficar sem administrador');
      await expect(dialogo.getByRole('button', { name: 'Transferir administração' })).toBeVisible();
      await paginaA.keyboard.press('Escape');
      await expect(dialogo).toBeHidden();
    });

    await test.step('A altera o papel de B e o devolve', async () => {
      // Dois `li` casam com o e-mail de B: a linha do membro e a do convite
      // que A ainda tem em cache. "No grupo desde" so existe na de membro.
      const linhaB = paginaA
        .getByRole('listitem')
        .filter({ hasText: usuarioB.email })
        .filter({ hasText: 'No grupo desde' });

      await paginaA.getByRole('button', { name: `Ações para ${usuarioB.nome}` }).click();
      await paginaA.getByText('Alterar papel').click();
      await paginaA.getByRole('dialog').getByLabel('Novo papel').selectOption('OBSERVADOR');
      await paginaA.getByRole('dialog').getByRole('button', { name: 'Alterar papel' }).click();
      await expect(paginaA.getByText(/agora é observador do grupo/)).toBeVisible();
      await expect(linhaB).toContainText('Observador');

      await paginaA.getByRole('button', { name: `Ações para ${usuarioB.nome}` }).click();
      await paginaA.getByText('Alterar papel').click();
      await paginaA.getByRole('dialog').getByLabel('Novo papel').selectOption('PARTICIPANTE');
      await paginaA.getByRole('dialog').getByRole('button', { name: 'Alterar papel' }).click();
      await expect(paginaA.getByText(/agora é participante do grupo/)).toBeVisible();
      await expect(linhaB).toContainText('Participante');
    });

    await test.step('A transfere a administração para B', async () => {
      await paginaA.getByRole('button', { name: 'Transferir administração' }).click();
      const dialogo = paginaA.getByRole('dialog');
      const confirmar = dialogo.getByRole('button', { name: 'Transferir administração' });

      await expect(confirmar).toBeDisabled();
      await dialogo
        .getByLabel('Novo administrador')
        .selectOption({ label: `${usuarioB.nome} (${usuarioB.email})` });
      // RN-28: a troca é irreversível para quem transfere, então exige o nome
      // digitado, não só a escolha.
      await expect(confirmar).toBeDisabled();
      await dialogo.getByLabel(/Digite/).fill(usuarioB.nome);
      await confirmar.click();

      await expect(paginaA.getByText(/Administração transferida/)).toBeVisible();
      // Quem transferiu perde as abas de administração na mesma tela, e o
      // saldo do grupo não é afetado por troca de papel.
      await expect(paginaA.getByRole('tab', { name: 'Configurações' })).toHaveCount(0);
      await expect(paginaA.getByRole('tab', { name: 'Auditoria' })).toHaveCount(0);
      expect(await saldoDoGrupo(paginaA)).toBe('R$ 130,00');
    });

    await test.step('B assume a administração e o saldo continua fechando', async () => {
      // A próxima ação de B revalida o detalhe do grupo, que é de onde saem as
      // abas e as permissões — o papel novo chega por aí, sem recarregar.
      await paginaB.getByRole('button', { name: 'Ações para Mercado do Bruno (revisado)' }).click();
      await paginaB.getByText('Editar').click();
      const dialogo = paginaB.getByRole('dialog');
      await dialogo.getByLabel('Descrição', { exact: true }).fill('Mercado do Bruno');
      await dialogo.getByRole('button', { name: 'Salvar alterações' }).click();
      await expect(paginaB.getByText('Mercado do Bruno').first()).toBeVisible();

      await expect(paginaB.getByRole('tab', { name: 'Configurações' })).toBeVisible();
      await abrirAba(paginaB, 'Membros');
      await expect(paginaB.getByRole('button', { name: 'Convidar membro' })).toBeVisible();

      expect(await saldoDoGrupo(paginaB)).toBe('R$ 130,00');
    });

    await contextoA.close();
    await contextoB.close();
  });
});
