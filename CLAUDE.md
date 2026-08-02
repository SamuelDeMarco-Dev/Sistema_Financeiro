# CLAUDE.md

Gerenciador de Finanças (PFM) — plataforma web de gestão financeira pessoal **e compartilhada**.

> **Leia [`docs/09-CLAUDE.md`](docs/09-CLAUDE.md) antes de escrever qualquer código.**
> Este arquivo é apenas o ponto de entrada. As diretrizes completas — 20 regras invioláveis,
> templates de código, checklist de autoverificação e o catálogo de erros que este projeto já
> sofreu — estão lá, e prevalecem sobre hábitos gerais de escrita de código.

---

## Antes de começar uma tarefa

1. Localize a issue em [`docs/07-ISSUES.md`](docs/07-ISSUES.md) — ela é o contrato de escopo.
2. Abra cada `RF-xx`/`RN-xx` que a issue citar em [`docs/01-SPECIFICATION.md`](docs/01-SPECIFICATION.md) e leia o texto integral. **Não presuma o conteúdo de uma regra.**
3. Confira as convenções em [`docs/05-DEVELOPMENT.md`](docs/05-DEVELOPMENT.md).
4. Se a tarefa toca contrato de API, banco ou infraestrutura, leia o documento correspondente.

## Documentação

| Documento                                              | Quando consultar                               |
| ------------------------------------------------------ | ---------------------------------------------- |
| [`docs/01-SPECIFICATION.md`](docs/01-SPECIFICATION.md) | Requisitos, regras de negócio, glossário pt-BR |
| [`docs/02-ARCHITECTURE.md`](docs/02-ARCHITECTURE.md)   | Camadas, estrutura de pastas, ADRs             |
| [`docs/03-DATABASE.md`](docs/03-DATABASE.md)           | Schema Prisma, constraints, índices, consultas |
| [`docs/04-API.md`](docs/04-API.md)                     | Contrato REST — divergir dele é defeito        |
| [`docs/05-DEVELOPMENT.md`](docs/05-DEVELOPMENT.md)     | Convenções, Git, testes, antipadrões           |
| [`docs/06-MILESTONES.md`](docs/06-MILESTONES.md)       | Roadmap e dependências entre entregas          |
| [`docs/07-ISSUES.md`](docs/07-ISSUES.md)               | As 128 issues detalhadas                       |
| [`docs/08-CICD.md`](docs/08-CICD.md)                   | Docker, deploy, Nginx, runbook                 |
| [`docs/09-CLAUDE.md`](docs/09-CLAUDE.md)               | **Diretrizes normativas de geração de código** |

## Stack

Node.js 22 LTS · Express · TypeScript estrito · Prisma 6 · PostgreSQL 16 · Zod · Vitest
React 18 · Vite 5 · TailwindCSS · Shadcn/UI · React Query v5 · React Hook Form · Recharts
Docker · PM2 cluster · Nginx · GitHub Actions · VPS Hostinger

## Regras que não admitem exceção

Estas são um resumo. O conjunto completo, com exemplos, está em [`docs/09-CLAUDE.md §3`](docs/09-CLAUDE.md#3-regras-invioláveis).

1. **Dinheiro é `Prisma.Decimal`** no backend e **centavos inteiros** no frontend. Nunca `number`, `Number()` ou `parseFloat()`. Na API, valores viajam como **string** (`"1234.56"`).
2. **`prisma` só em `repositorios/` e `banco/`.** Serviço que importa `prisma` está errado por construção.
3. **Nada de `req`/`res` em `servicos/`**, nada de regra de negócio em controlador ou componente React.
4. **Autorização na camada de serviço.** Verificação apenas no frontend não é segurança.
5. **Recurso de outro usuário responde `404`**, nunca `403` — `403` confirmaria a existência do recurso.
6. **Escritas múltiplas ou que alterem saldo vão em `prisma.$transaction`**, com o `tx` propagado até o repositório.
7. **Saldo é sempre calculado** a partir das movimentações. Nunca uma coluna de escrita direta.
8. **Toda entrada externa passa por schema Zod**; o DTO é inferido com `z.infer`, nunca declarado à parte.
9. **Toda listagem é paginada** (padrão 20, máximo 100).
10. **Toda mutação no frontend invalida o cache em cascata.** Saldo velho na tela é defeito de severidade alta.
11. **Domínio em pt-BR** (classes, pastas, entidades, tabelas, rotas); identificadores **sem acento** — `movimentacao`, não `movimentação`.
12. **`any` é proibido.** Use `unknown` e estreite.

## Natureza do sistema

Este é um sistema **financeiro**. Um erro de centavo é defeito, não arredondamento aceitável. Um saldo errado destrói a confiança do usuário no produto inteiro. **Precisão e correção têm precedência sobre elegância, brevidade e velocidade de entrega.**

Teste os limites, não só o caminho feliz: zero, negativo, arredondamento, virada de mês, ano bissexto, pagamento parcial, papel insuficiente.

## Comandos

O projeto ainda não foi inicializado (é a issue #1). Após a fundação:

```bash
cd backend  && npm run verificar   # PORTÃO: tipos + lint + formato + testes
cd frontend && npm run verificar   # PORTÃO: tipos + lint + testes
docker compose up -d               # postgres + postgres_teste + mailpit
```

## Git

Duas branches permanentes: **`main`** (produção, merge dispara deploy) e **`staging`** (desenvolvimento).
Trabalho sai de `staging` em branches efêmeras `issue/<numero>-<slug>`.
Commits em [Conventional Commits](docs/05-DEVELOPMENT.md#10-conventional-commits) pt-BR: `feat(contas): adiciona listagem`.

## Quando parar e perguntar

Quando a documentação se contradiz, quando a issue exige violar uma regra acima, quando um caso-limite não está coberto pela especificação, quando falta uma dependência da issue, ou quando a implementação correta exigiria mudar o contrato de API. Ver [`docs/09-CLAUDE.md §8`](docs/09-CLAUDE.md#8-quando-parar-e-perguntar).
