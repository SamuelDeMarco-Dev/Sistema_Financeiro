# Gerenciador de Finanças (PFM)

Plataforma web de gestão financeira pessoal **e compartilhada**. O diferencial é tratar
finanças de grupo (casal, família, república, sócios) como recurso de primeira classe,
no mesmo sistema das finanças individuais.

> **Antes de escrever qualquer código, leia [`CLAUDE.md`](CLAUDE.md) e a documentação em [`docs/`](docs/).**
> `docs/07-ISSUES.md` é o contrato de escopo de cada entrega; `docs/09-CLAUDE.md` reúne as
> regras invioláveis de implementação.

---

## Stack

| Camada | Tecnologia |
| ------ | ---------- |
| Backend | Node.js 22 LTS · Express · TypeScript estrito · Prisma 6 · PostgreSQL 16 · Zod · Vitest |
| Frontend | React 18 · Vite 5 · TailwindCSS · Shadcn/UI · React Query v5 · React Hook Form · Recharts |
| Infra | Docker · PM2 (cluster) · Nginx · GitHub Actions · VPS Hostinger |

Monorepo com dois pacotes independentes (`backend/`, `frontend/`), sem dependência de build
entre si. O contrato entre eles é [`docs/04-API.md`](docs/04-API.md).

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
npm run seed
npm run dev                   # http://localhost:3333

# 4) Frontend (outro terminal)
cd ../frontend
cp .env.exemplo .env
npm run dev                   # http://localhost:5173
```

Ou, a partir da raiz, suba os dois em paralelo com `npm run dev`.

| Serviço | Endereço |
| ------- | -------- |
| API | http://localhost:3333 |
| Documentação da API | http://localhost:3333/api/docs |
| Frontend | http://localhost:5173 |
| Prisma Studio | http://localhost:5555 |
| Mailpit (e-mails capturados) | http://localhost:8025 |

---

## Scripts da raiz

| Script | Efeito |
| ------ | ------ |
| `npm run dev` | Sobe backend e frontend em paralelo |
| `npm run build` | Build dos dois pacotes |
| `npm run verificar` | **Portão**: tipos + lint + formato + testes nos dois pacotes |
| `npm run lint` / `npm run formatar` | Lint e formatação nos dois pacotes |

Cada pacote também expõe seus próprios scripts — ver [`docs/05-DEVELOPMENT.md §3`](docs/05-DEVELOPMENT.md#3-scripts-npm).

---

## Documentação

Índice completo em [`docs/README.md`](docs/README.md). Ordem de leitura recomendada para
onboarding: `01` → `02` → `05` → `03` → `04` → `06`.

---

## Fluxo de trabalho

Duas branches permanentes: **`main`** (produção, merge dispara deploy) e **`staging`**
(desenvolvimento). Trabalho sai de `staging` em branches efêmeras `issue/<numero>-<slug>`,
com commits em [Conventional Commits](docs/05-DEVELOPMENT.md#10-conventional-commits) pt-BR.
Detalhes em [`docs/05-DEVELOPMENT.md §9`](docs/05-DEVELOPMENT.md#9-fluxo-git).

## Licença

Projeto privado — todos os direitos reservados.
