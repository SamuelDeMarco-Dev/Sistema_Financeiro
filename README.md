# Gerenciador de Finanças (PFM)

Plataforma web de gestão financeira pessoal **e compartilhada**. O diferencial é tratar
finanças de grupo (casal, família, república, sócios) como recurso de primeira classe,
no mesmo sistema das finanças individuais.

> **Antes de escrever qualquer código, leia [`CLAUDE.md`](CLAUDE.md) e a documentação em [`docs/`](docs/).**
> `docs/07-ISSUES.md` é o contrato de escopo de cada entrega; `docs/09-CLAUDE.md` reúne as
> regras invioláveis de implementação.

---

## Estado atual

**Versão `1.1.0`** — milestones **M0 a M6** concluídas, 78 issues fechadas.
O sistema roda de ponta a ponta em ambiente local. **Ainda não há implantação em
produção:** a infraestrutura da M5 (Dockerfile, compose de produção, Nginx, backup,
rollback e os workflows de deploy) está escrita e versionada, mas nenhuma VPS foi
provisionada — ver [`docs/08-CICD.md §12`](docs/08-CICD.md).

### O que já funciona

| Área                      | Entregue                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Identidade**            | Cadastro, verificação por e-mail, login, renovação transparente de token, recuperação de senha, sessões |
| **Perfil**                | Nome, avatar, tema claro/escuro, preferências, troca de senha                                           |
| **Contas**                | CRUD, arquivamento, reordenação, saldo atual e previsto, consolidação                                   |
| **Categorias**            | Catálogo padrão do sistema, categorias próprias com um nível de subcategoria, etiquetas                 |
| **Movimentações**         | Receitas e despesas, recorrência, pagamento total e parcial, estorno, duplicação, anexos, filtros       |
| **Transferências**        | Par vinculado entre contas, criado e excluído atomicamente                                              |
| **Visão consolidada**     | Painel com indicadores, fluxo de caixa de 12 meses, despesas por categoria, relatórios                  |
| **Contas compartilhadas** | Grupos com papéis, convites por e-mail, permissões resolvidas no servidor, autoria dos lançamentos      |

### O que ainda não existe

Metas (M7), cartões de crédito e faturas (M8), orçamentos e notificações (M9),
exportações (M10), pesquisa global e auditoria (M11). Roadmap em
[`docs/06-MILESTONES.md`](docs/06-MILESTONES.md).

---

## Stack

| Camada   | Tecnologia                                                                                |
| -------- | ----------------------------------------------------------------------------------------- |
| Backend  | Node.js 22 LTS · Express · TypeScript estrito · Prisma 6 · PostgreSQL 16 · Zod · Vitest   |
| Frontend | React 18 · Vite 5 · TailwindCSS · Shadcn/UI · React Query v5 · React Hook Form · Recharts |
| Infra    | Docker · PM2 (cluster) · Nginx · GitHub Actions · VPS Hostinger                           |

Monorepo com dois pacotes independentes (`backend/`, `frontend/`), sem dependência de build
entre si. O contrato entre eles é [`docs/04-API.md`](docs/04-API.md).

Dinheiro é `Prisma.Decimal` no backend e centavos inteiros no frontend; na API os valores
viajam como string (`"1234.56"`). Nenhuma operação monetária usa ponto flutuante.

---

## Setup local

Pré-requisitos: Node.js 22 (fixado em [`.nvmrc`](.nvmrc)), npm 10+, Docker Desktop, Git.

```bash
git clone <repo> GerenciadorDeFinancas
cd GerenciadorDeFinancas

# 1) Instala as dependências dos dois pacotes a partir da raiz (workspaces)
npm ci

# 2) Banco e serviços de apoio
docker compose up -d

# 3) Backend
cd backend
cp .env.exemplo .env
npx prisma migrate dev
npm run seed                  # catálogo de categorias padrão
npm run dev                   # http://localhost:3333

# 4) Frontend (outro terminal)
cd ../frontend
cp .env.exemplo .env
npm run dev                   # http://localhost:5173
```

Ou, a partir da raiz, suba os dois em paralelo com `npm run dev`.

O primeiro acesso passa pelo cadastro. O link de verificação **não** sai da máquina: ele
chega no Mailpit, em http://localhost:8025.

### Ambiente Docker (banco, banco de teste e e-mail)

O [`docker-compose.yml`](docker-compose.yml) da raiz sobe três serviços: PostgreSQL de
desenvolvimento (5432), PostgreSQL de teste (5433, `tmpfs`, dados descartáveis) e Mailpit
para capturar e-mails localmente — nenhum e-mail real sai de máquina de desenvolvimento.

```bash
docker compose up -d           # sobe os três serviços em segundo plano
docker compose ps              # confere o healthcheck (pg_isready) dos dois bancos
docker compose logs -f postgres
docker compose down            # derruba os serviços, mantém o volume do banco de dev
docker compose down -v         # derruba e remove os volumes (perde dados locais)
```

As credenciais (`pfm` / `pfm_local`) e os bancos (`pfm`, `pfm_teste`) estão alinhados com
`backend/.env.exemplo`.

Por ser `tmpfs`, o banco de teste perde o schema sempre que o contêiner reinicia. Se a
suíte de integração falhar reclamando de tabela inexistente, reaplique as migrations nele:

```bash
cd backend
DATABASE_URL="postgresql://pfm:pfm_local@localhost:5433/pfm_teste?schema=public" npx prisma migrate deploy
```

| Serviço                      | Endereço              |
| ---------------------------- | --------------------- |
| API                          | http://localhost:3333 |
| Frontend                     | http://localhost:5173 |
| PostgreSQL (dev)             | localhost:5432        |
| PostgreSQL (teste)           | localhost:5433        |
| Prisma Studio                | http://localhost:5555 |
| Mailpit (e-mails capturados) | http://localhost:8025 |

---

## Scripts da raiz

| Script                              | Efeito                                                       |
| ----------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                       | Sobe backend e frontend em paralelo                          |
| `npm run build`                     | Build dos dois pacotes                                       |
| `npm run verificar`                 | **Portão**: tipos + lint + formato + testes nos dois pacotes |
| `npm run lint` / `npm run formatar` | Lint e formatação nos dois pacotes                           |

`npm run verificar` é o mesmo portão que a CI executa e que o hook de pré-commit dispara
sobre os arquivos alterados. Hoje ele cobre **1.392 testes** — 812 no backend, 580 no
frontend.

O cenário de ponta a ponta (Playwright) roda à parte, contra a pilha já de pé:

```bash
docker compose up -d && npm run dev      # em outro terminal
npm run e2e --workspace=frontend
```

Cada pacote também expõe seus próprios scripts — ver [`docs/05-DEVELOPMENT.md §3`](docs/05-DEVELOPMENT.md#3-scripts-npm).

---

## Documentação

Índice completo em [`docs/README.md`](docs/README.md). Ordem de leitura recomendada para
onboarding: `01` → `02` → `05` → `03` → `04` → `06`.

| Documento                                              | Assunto                                        |
| ------------------------------------------------------ | ---------------------------------------------- |
| [`docs/01-SPECIFICATION.md`](docs/01-SPECIFICATION.md) | Requisitos, regras de negócio, glossário pt-BR |
| [`docs/02-ARCHITECTURE.md`](docs/02-ARCHITECTURE.md)   | Camadas, estrutura de pastas, ADRs             |
| [`docs/03-DATABASE.md`](docs/03-DATABASE.md)           | Schema Prisma, constraints, índices            |
| [`docs/04-API.md`](docs/04-API.md)                     | Contrato REST                                  |
| [`docs/05-DEVELOPMENT.md`](docs/05-DEVELOPMENT.md)     | Convenções, Git, testes, antipadrões           |
| [`docs/06-MILESTONES.md`](docs/06-MILESTONES.md)       | Roadmap e dependências entre entregas          |
| [`docs/07-ISSUES.md`](docs/07-ISSUES.md)               | As 128 issues detalhadas                       |
| [`docs/08-CICD.md`](docs/08-CICD.md)                   | Docker, deploy, Nginx, runbook operacional     |

---

## Fluxo de trabalho

Duas branches permanentes: **`main`** (produção, merge dispara deploy) e **`staging`**
(desenvolvimento). Trabalho sai de `staging` em branches efêmeras `issue/<numero>-<slug>`,
com commits em [Conventional Commits](docs/05-DEVELOPMENT.md#10-conventional-commits) pt-BR.
Detalhes em [`docs/05-DEVELOPMENT.md §9`](docs/05-DEVELOPMENT.md#9-fluxo-git).

## Licença

Projeto privado — todos os direitos reservados.
