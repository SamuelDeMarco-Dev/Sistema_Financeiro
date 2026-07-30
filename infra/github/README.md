# Importação de Milestones e Issues para o GitHub

Cria no GitHub os **34 rótulos**, as **12 Milestones** e as **128 issues** descritas em [`docs/07-ISSUES.md`](../../docs/07-ISSUES.md), usando o [GitHub CLI](https://cli.github.com).

O documento é a fonte única de verdade. O script apenas o traduz para o GitHub — nunca o contrário.

| Arquivo | Papel |
| ------- | ----- |
| `importar-issues.mjs` | Script de importação |
| `verificar-parsing.mjs` | Valida o documento sem tocar na rede |
| `rotulos.json` | Nome, cor e descrição de cada rótulo |
| `.estado-importacao.json` | Progresso (gerado; **não versionar**) |

---

## ⚠️ Leia antes de executar: a numeração

As issues referenciam umas às outras por `Depende de: #7`, usando a numeração do documento (**1 a 128**).

**No GitHub, issues e pull requests compartilham a mesma sequência de números.** Se o repositório já tiver qualquer issue ou PR — inclusive fechado —, a numeração ficará deslocada e todo `Depende de: #N` apontará para o alvo errado.

O script detecta isso e **aborta** antes de escrever. Portanto:

> **Importe em um repositório novo e vazio, antes de abrir o primeiro PR.**

Se precisar importar num repositório já em uso, `--forcar` prossegue. As referências `Depende de:` ficarão deslocadas, mas o rodapé de cada issue continua citando o número correto do documento — a rastreabilidade se preserva, só o auto-link do GitHub fica errado.

---

## Pré-requisitos

### 1. Node.js 22

Já é requisito do projeto. O script não tem dependências além da biblioteca padrão.

```bash
node --version    # deve ser v22.x
```

### 2. GitHub CLI

```powershell
winget install --id GitHub.cli
```

Feche e reabra o terminal, então autentique:

```bash
gh --version
gh auth login       # escolha GitHub.com > HTTPS > autenticar pelo navegador
gh auth status
```

### 3. Repositório Git com remoto no GitHub

O repositório **já existe**: [`SamuelDeMarco-Dev/Sistema_Financeiro`](https://github.com/SamuelDeMarco-Dev/Sistema_Financeiro), com a documentação publicada em `main`.

Falta apenas criar a branch de desenvolvimento prevista em [ADR-011](../../docs/02-ARCHITECTURE.md#adr-011--duas-branches-permanentes):

```bash
cd c:/GerenciadorDeFinancas

git checkout -b staging
git push -u origin staging
git checkout main
```

Confirme também que Issues está habilitado em **Settings → Features → Issues**.

> O script detecta o repositório automaticamente pelo remoto `origin`. Não é necessário passar `--repo`.

---

## Uso

### Passo 1 — Validar o documento (sem rede)

```bash
node infra/github/verificar-parsing.mjs
```

Confere numeração 1–128 sem lacuna, ordem crescente, soma de pontos por Milestone (603 no total), presença de checklist e critérios de aceite em cada issue, dependências apontando só para issues anteriores, rótulos com cor definida e ausência de corrupção de encoding.

Rode isto sempre que editar `docs/07-ISSUES.md`.

### Passo 2 — Simular

Simulação é o **modo padrão**: nada é criado sem `--aplicar`.

```bash
node infra/github/importar-issues.mjs
```

Funciona mesmo sem o `gh` instalado, para você inspecionar o plano antes.

### Passo 3 — Aplicar

Recomendo começar por uma Milestone e conferir o resultado na interface:

```bash
node infra/github/importar-issues.mjs --aplicar --somente M0
```

Satisfeito, importe o resto:

```bash
node infra/github/importar-issues.mjs --aplicar
```

Leva cerca de **3 minutos** (pausa de 1,2 s entre criações, para não bater no limite secundário de taxa da API).

---

## Opções

| Opção | Efeito |
| ----- | ------ |
| `--aplicar` | Efetiva as escritas. Sem ela, apenas simula |
| `--repo <owner/nome>` | Repositório alvo. Padrão: detectado por `gh repo view` |
| `--somente <lista>` | Só as Milestones indicadas: `--somente M0,M1,M2` |
| `--pausa <ms>` | Intervalo entre criações. Padrão `1200` |
| `--branch <nome>` | Branch usada nos links dos corpos. Padrão `main` |
| `--sem-rotulos` | Não cria nem atualiza rótulos |
| `--sem-milestones` | Não cria nem atualiza Milestones |
| `--forcar` | Ignora o aborto por desalinhamento de numeração |
| `--ajuda` | Mostra a ajuda |

---

## Retomada após falha

O progresso é gravado em `.estado-importacao.json` **após cada criação**. Se o script falhar na issue #70, basta reexecutar: as 69 anteriores são puladas e a importação continua de onde parou.

```bash
node infra/github/importar-issues.mjs --aplicar     # retoma automaticamente
```

Para começar do zero, remova o arquivo de estado — e apague as issues já criadas no GitHub, senão haverá duplicatas:

```bash
rm infra/github/.estado-importacao.json
```

O estado guarda o repositório alvo. Apontar para outro repositório sem limpar o estado é bloqueado.

---

## O que cada issue recebe

- **Título** — exatamente o do documento, já em Conventional Commits (`feat(contas): ...`), servindo como mensagem do commit de squash.
- **Corpo** — descrição, checklist técnico e critérios de aceite, com os links dos documentos convertidos em URLs absolutas (links relativos quebram dentro de issues do GitHub).
- **Rodapé** — Milestone, estimativa em pontos, requisitos (`RF-xx`/`RN-xx`), dependências e link para a especificação completa.
- **Rótulos** — camada, tipo, domínio e prioridade.
- **Milestone** — vinculada automaticamente.

---

## Solução de problemas

**`gh: command not found`** — instale o CLI e reabra o terminal para o PATH ser recarregado.

**`Nao foi possivel detectar o repositorio`** — o diretório não é um repo Git com remoto no GitHub. Siga o pré-requisito 3, ou passe `--repo owner/nome`.

**`O repositorio ja possui issues ou pull requests`** — veja a seção sobre numeração. Prefira um repositório vazio.

**`Limite de taxa atingido`** — o script aguarda e repete automaticamente (até 4 tentativas, com espera crescente). Se persistir, aumente a pausa: `--pausa 2500`.

**`could not add label: 'xxx' not found`** — os rótulos não foram criados. Rode sem `--sem-rotulos`, ou crie-os antes com `--somente M0`.

**Rótulos com cor errada** — edite `rotulos.json` e reexecute; `gh label create --force` atualiza os existentes.

---

## Manutenção

Ao editar `docs/07-ISSUES.md`, o script **não** sincroniza issues já criadas — ele apenas cria as ausentes. Alterações em issues existentes devem ser feitas na interface do GitHub ou por `gh issue edit`.

Se acrescentar uma issue nova ao documento, numere-a a partir de **#129**, mantendo a ordem crescente. Renumerar issues existentes quebraria as referências cruzadas já publicadas.

O `verificar-parsing.mjs` valida contra os totais fixados no topo do arquivo (`TOTAL_ISSUES`, `TOTAL_PONTOS`, `PONTOS_POR_MS`). Ao mudar o escopo do roadmap, atualize esses valores junto de [`docs/06-MILESTONES.md`](../../docs/06-MILESTONES.md).
