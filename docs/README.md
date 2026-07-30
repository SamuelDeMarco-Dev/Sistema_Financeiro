# Documentação — Gerenciador de Finanças (PFM)

> **Personal Finance Manager** — plataforma de gestão financeira pessoal e compartilhada.
> Documentação de engenharia. Fonte única de verdade do projeto.

| Versão da documentação | Data | Status |
| ---------------------- | ---- | ------ |
| 1.0.0 | 2026-07-29 | Vigente |

---

## Índice

| # | Documento | Conteúdo | Público-alvo |
| - | --------- | -------- | ------------ |
| 01 | [01-SPECIFICATION.md](01-SPECIFICATION.md) | Visão do produto, requisitos funcionais (RF) e não funcionais (RNF), regras de negócio (RN), glossário | Produto, engenharia, QA |
| 02 | [02-ARCHITECTURE.md](02-ARCHITECTURE.md) | Arquitetura em camadas, estrutura de pastas, fluxo de requisição, ADRs (decisões técnicas) | Engenharia |
| 03 | [03-DATABASE.md](03-DATABASE.md) | Modelo ER, schema Prisma completo, índices, constraints, migrations, seed | Engenharia, DBA |
| 04 | [04-API.md](04-API.md) | Contratos REST completos, envelope de resposta, códigos de erro, exemplos de request/response | Backend, frontend, integradores |
| 05 | [05-DEVELOPMENT.md](05-DEVELOPMENT.md) | Convenções pt-BR, nomenclatura, Conventional Commits, fluxo Git, testes, qualidade | Engenharia |
| 06 | [06-MILESTONES.md](06-MILESTONES.md) | Roadmap dividido em 12 Milestones com escopo, entregáveis e critérios de fechamento | Produto, engenharia |
| 07 | [07-ISSUES.md](07-ISSUES.md) | Todas as issues detalhadas por Milestone (descrição, checklist, dependências, critérios de aceite) | Engenharia |
| 08 | [08-CICD.md](08-CICD.md) | GitHub Actions, Docker, deploy automático na VPS Hostinger, Nginx, PM2, SSL, rollback | DevOps, engenharia |
| 09 | [09-CLAUDE.md](09-CLAUDE.md) | Instruções operacionais para o Claude Code gerar código aderente a esta arquitetura | Claude Code |

Diretório [assets/](assets/) — diagramas, imagens e mockups referenciados pelos documentos.

---

## Como usar esta documentação

**Onboarding de um novo desenvolvedor (ordem de leitura):**
`01` → `02` → `05` → `03` → `04` → `06`.

**Antes de escrever qualquer código:** leia `09-CLAUDE.md` e a issue correspondente em `07-ISSUES.md`.

**Ao implementar uma feature:** a issue em `07` é o contrato de escopo; `04` é o contrato de API; `03` é o contrato de dados. Divergência entre documentos deve ser resolvida abrindo uma issue de `docs:`, nunca improvisada no código.

---

## Stack tecnológica consolidada

| Camada | Tecnologia |
| ------ | ---------- |
| Runtime | Node.js 22 LTS |
| Backend | Express 4, TypeScript |
| ORM | Prisma 6 |
| Banco | PostgreSQL 16 |
| Validação | Zod |
| Auth | JWT (access + refresh), bcrypt |
| Docs de API | Swagger / OpenAPI 3.1 |
| Testes backend | Vitest + Supertest |
| Frontend | React 18, Vite 5, TypeScript |
| Estilo | TailwindCSS 3 + Shadcn/UI |
| Dados (client) | React Query (TanStack Query v5) |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| Animação | Framer Motion |
| Testes frontend | Vitest + Testing Library + Playwright (E2E) |
| Containerização | Docker + Docker Compose |
| Process manager | PM2 (`pm2-runtime`, modo cluster) |
| Proxy reverso | Nginx |
| TLS | Let's Encrypt (Certbot) |
| CI/CD | GitHub Actions |
| Hospedagem | VPS Hostinger (Ubuntu 24.04 LTS) |

---

## Convenções-chave (resumo)

- **Idioma do código:** pt-BR para classes, pastas, entidades, tabelas, colunas e rotas. Palavras reservadas e bibliotecas permanecem em inglês. Detalhes em `05-DEVELOPMENT.md`.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `ci:`, `build:`, `style:`.
- **Branches permanentes:** `main` (produção) e `staging` (desenvolvimento/homologação).
- **Fechamento de Milestone:** Pull Request `staging` → `main`. O merge em `main` dispara o deploy automático em produção.

---

## Histórico de revisões

| Versão | Data | Autor | Descrição |
| ------ | ---- | ----- | --------- |
| 1.0.0 | 2026-07-29 | Samuel De Marco | Documentação inicial completa (09 documentos), consolidando e substituindo `specs/SPEC.md`. |
