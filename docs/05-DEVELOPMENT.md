# 05 — Padrões de Desenvolvimento

> **Documento:** Convenções, Fluxo de Trabalho e Qualidade
> **Projeto:** Gerenciador de Finanças (PFM)
> **Versão:** 1.0.0 · **Data:** 2026-07-29 · **Status:** Vigente

---

## Sumário

1. [Ambiente de desenvolvimento](#1-ambiente-de-desenvolvimento)
2. [Variáveis de ambiente](#2-variáveis-de-ambiente)
3. [Scripts npm](#3-scripts-npm)
4. [Nomenclatura](#4-nomenclatura)
5. [Padrões de código — TypeScript](#5-padrões-de-código--typescript)
6. [Padrões de código — Backend](#6-padrões-de-código--backend)
7. [Padrões de código — Frontend](#7-padrões-de-código--frontend)
8. [Lint e formatação](#8-lint-e-formatação)
9. [Fluxo Git](#9-fluxo-git)
10. [Conventional Commits](#10-conventional-commits)
11. [Pull Requests e revisão](#11-pull-requests-e-revisão)
12. [Estratégia de testes](#12-estratégia-de-testes)
13. [Definição de Pronto](#13-definição-de-pronto)
14. [Antipadrões proibidos](#14-antipadrões-proibidos)

---

## 1. Ambiente de desenvolvimento

### 1.1 Pré-requisitos

| Ferramenta | Versão | Verificação |
| ---------- | ------ | ----------- |
| Node.js | 22 LTS | `node -v` |
| npm | 10+ | `npm -v` |
| Docker Desktop | 4.30+ | `docker -v` |
| Git | 2.40+ | `git --version` |

A versão do Node é fixada em `.nvmrc` (`22`) e em `engines` do `package.json`. Divergência de *major* causa diferenças reais de comportamento em `Intl`, *streams* e resolução de módulos — o CI valida.

### 1.2 Setup inicial

```bash
git clone <repo> GerenciadorDeFinancas
cd GerenciadorDeFinancas

# 1) Banco e serviços de apoio
docker compose up -d postgres

# 2) Backend
cd backend
cp .env.exemplo .env          # ajuste os valores
npm ci
npx prisma migrate dev
npm run seed
npm run dev                   # http://localhost:3333

# 3) Frontend (outro terminal)
cd ../frontend
cp .env.exemplo .env
npm ci
npm run dev                   # http://localhost:5173
```

### 1.3 Portas

| Serviço | Porta |
| ------- | ----- |
| API | 3333 |
| Frontend (Vite) | 5173 |
| PostgreSQL | 5432 |
| PostgreSQL de teste | 5433 |
| Prisma Studio | 5555 |
| Mailpit (captura de e-mail local) | 8025 (UI) / 1025 (SMTP) |

O Mailpit intercepta todos os e-mails em desenvolvimento. Nenhum e-mail real é enviado a partir de máquina local — configuração garantida por `SMTP_HOST=localhost` no `.env.exemplo`.

### 1.4 Extensões recomendadas (VS Code)

`dbaeumer.vscode-eslint` · `esbenp.prettier-vscode` · `Prisma.prisma` · `bradlc.vscode-tailwindcss` · `vitest.explorer` · `usernamehw.errorlens`

O repositório inclui `.vscode/settings.json` com `formatOnSave`, `codeActionsOnSave.source.fixAll.eslint` e `typescript.preferences.importModuleSpecifier: "non-relative"`.

---

## 2. Variáveis de ambiente

### 2.1 Backend — `backend/.env.exemplo`

```dotenv
# ── Aplicação ────────────────────────────────────────────────
NODE_ENV=development
PORTA=3333
URL_BASE_API=http://localhost:3333
URL_BASE_FRONTEND=http://localhost:5173

# ── Banco de dados ──────────────────────────────────────────
DATABASE_URL="postgresql://pfm:pfm_local@localhost:5432/pfm?schema=public"
DATABASE_URL_TESTE="postgresql://pfm:pfm_local@localhost:5433/pfm_teste?schema=public"

# ── Autenticação ────────────────────────────────────────────
JWT_SEGREDO=troque-por-um-segredo-de-64-caracteres-em-producao
JWT_EXPIRACAO=15m
REFRESH_TOKEN_EXPIRACAO_DIAS=7
REFRESH_TOKEN_EXPIRACAO_DIAS_LEMBRAR=30
BCRYPT_CUSTO=12

# ── CORS ────────────────────────────────────────────────────
ORIGENS_PERMITIDAS=http://localhost:5173

# ── E-mail ──────────────────────────────────────────────────
SMTP_HOST=localhost
SMTP_PORTA=1025
SMTP_USUARIO=
SMTP_SENHA=
SMTP_SEGURO=false
EMAIL_REMETENTE="PFM <nao-responda@pfm.local>"

# ── Uploads ─────────────────────────────────────────────────
DIRETORIO_UPLOADS=./uploads
TAMANHO_MAXIMO_ANEXO_MB=5
TAMANHO_MAXIMO_AVATAR_MB=2

# ── Rate limit ──────────────────────────────────────────────
RATE_LIMIT_JANELA_MINUTOS=15
RATE_LIMIT_MAXIMO=1000

# ── Observabilidade ─────────────────────────────────────────
NIVEL_LOG=debug
HABILITAR_TAREFAS_AGENDADAS=true
```

### 2.2 Frontend — `frontend/.env.exemplo`

```dotenv
VITE_API_URL=http://localhost:3333/api/v1
VITE_AMBIENTE=development
VITE_NOME_APP="Gerenciador de Finanças"
```

Apenas variáveis com prefixo `VITE_` chegam ao *bundle* — e tudo que chega ao *bundle* é **público**. Nenhum segredo, chave de API ou credencial no frontend, em nenhuma hipótese.

### 2.3 Validação obrigatória na inicialização

```ts
// src/configuracao/ambiente.ts
import { z } from 'zod';

const esquemaAmbiente = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORTA: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().url(),
  JWT_SEGREDO: z.string().min(32, 'JWT_SEGREDO deve ter no mínimo 32 caracteres.'),
  JWT_EXPIRACAO: z.string().default('15m'),
  BCRYPT_CUSTO: z.coerce.number().int().min(10).max(14).default(12),
  ORIGENS_PERMITIDAS: z.string().transform((v) => v.split(',').map((o) => o.trim())),
  // ...
});

const resultado = esquemaAmbiente.safeParse(process.env);

if (!resultado.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(resultado.error.flatten().fieldErrors);
  process.exit(1);
}

export const ambiente = resultado.data;
```

A aplicação **falha ao iniciar** com configuração inválida. Um `JWT_SEGREDO` ausente descoberto às 3h da manhã em produção é muito pior que um contêiner que se recusa a subir no deploy.

Nenhum outro arquivo lê `process.env` diretamente — todos importam `ambiente`. Isso é verificado por regra de ESLint.

---

## 3. Scripts npm

### 3.1 Backend

| Script | Comando | Uso |
| ------ | ------- | --- |
| `dev` | `tsx watch src/index.ts` | Desenvolvimento com *hot reload* |
| `build` | `tsc -p tsconfig.build.json` | Compila para `dist/` |
| `start` | `node dist/index.js` | Execução do artefato |
| `lint` | `eslint . --max-warnings 0` | Lint (zero *warnings*) |
| `lint:fix` | `eslint . --fix` | Correção automática |
| `formatar` | `prettier --write .` | Formatação |
| `formatar:check` | `prettier --check .` | Verificação (CI) |
| `tipos` | `tsc --noEmit` | Checagem de tipos |
| `teste` | `vitest run` | Todos os testes |
| `teste:observar` | `vitest` | Modo *watch* |
| `teste:unitario` | `vitest run testes/unitarios` | Só unitários |
| `teste:integracao` | `vitest run testes/integracao` | Só integração |
| `teste:cobertura` | `vitest run --coverage` | Cobertura |
| `prisma:migrate` | `prisma migrate dev` | Nova migration |
| `prisma:deploy` | `prisma migrate deploy` | Aplicar migrations |
| `prisma:studio` | `prisma studio` | UI do banco |
| `seed` | `tsx prisma/seed.ts` | Popular banco |
| `verificar` | `npm run tipos && npm run lint && npm run formatar:check && npm run teste` | **Portão local antes de commitar** |

### 3.2 Frontend

| Script | Comando |
| ------ | ------- |
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `preview` | `vite preview` |
| `lint` | `eslint . --max-warnings 0` |
| `tipos` | `tsc --noEmit` |
| `teste` | `vitest run` |
| `teste:cobertura` | `vitest run --coverage` |
| `e2e` | `playwright test` |
| `verificar` | `npm run tipos && npm run lint && npm run teste` |

`npm run verificar` reproduz exatamente o que o CI executa. Rodá-lo antes do *push* é a diferença entre descobrir um problema em 30 segundos ou em 6 minutos.

---

## 4. Nomenclatura

### 4.1 Regra geral

**Domínio em pt-BR; linguagem e bibliotecas em inglês** (ADR-003).

| Categoria | Idioma | Caso | Exemplo |
| --------- | ------ | ---- | ------- |
| Entidades e modelos | pt-BR | `PascalCase` | `Movimentacao`, `ContaCompartilhada` |
| Classes | pt-BR | `PascalCase` | `MovimentacaoServico`, `ProibidoErro` |
| Tabelas | pt-BR | `snake_case` plural | `movimentacoes`, `contas_compartilhadas` |
| Colunas (banco) | pt-BR | `snake_case` | `data_competencia`, `valor_pago` |
| Campos (Prisma/TS/JSON) | pt-BR | `camelCase` | `dataCompetencia`, `valorPago` |
| Funções e métodos | pt-BR | `camelCase` | `calcularSaldoAtual()`, `listarPorPeriodo()` |
| Variáveis | pt-BR | `camelCase` | `saldoAtual`, `movimentacoesPendentes` |
| Constantes | pt-BR | `SCREAMING_SNAKE_CASE` | `LIMITE_PAGINA_PADRAO` |
| Enums e valores | pt-BR | `PascalCase` / `SCREAMING_SNAKE_CASE` | `SituacaoMovimentacao.PAGA_PARCIALMENTE` |
| Tipos e interfaces | pt-BR | `PascalCase` | `FiltroMovimentacao`, `CriarContaDTO` |
| Arquivos | pt-BR | `kebab-case` | `movimentacao.servico.ts` |
| Componentes React | pt-BR | `PascalCase` | `CartaoResumoConta.tsx` |
| Hooks | pt-BR com `usar` | `camelCase` | `usarMovimentacoes()` |
| Rotas de API | pt-BR | `kebab-case` plural | `/contas-compartilhadas` |
| Branches | pt-BR | `kebab-case` | `issue/42-criar-movimentacoes` |
| Chaves de envelope de API | **inglês** | `camelCase` | `success`, `data`, `meta` (ADR-004) |
| Palavras-chave e APIs de libs | **inglês** | — | `async`, `useState`, `findMany` |

### 4.2 Sem acentos e sem cedilha em identificadores

Identificadores de código, arquivos, tabelas e colunas usam **apenas ASCII**: `movimentacao`, não `movimentação`; `orcamento`, não `orçamento`; `situacao`, não `situação`.

Motivo: caracteres não-ASCII em identificadores criam problemas reais em *tooling*, *locale* de banco, *encoding* de terminal e nomes de arquivo entre Windows e Linux. Acentuação é obrigatória apenas em **texto exibido ao usuário** (mensagens, rótulos, documentação).

```ts
// ✅
const situacaoMovimentacao = 'PAGA';
throw new RegraNegocioErro('A movimentação já foi paga.');

// ❌
const situaçãoMovimentação = 'PAGA';
```

### 4.3 Verbos padronizados

| Verbo | Uso | Exemplo |
| ----- | --- | ------- |
| `criar` | Cria recurso | `criarMovimentacao()` |
| `listar` | Retorna coleção paginada | `listarMovimentacoes()` |
| `buscar` | Retorna um ou `null` | `buscarPorId()` |
| `obter` | Retorna um ou **lança** se não achar | `obterPorId()` |
| `atualizar` | Alteração parcial | `atualizarMovimentacao()` |
| `substituir` | Alteração total | `substituirPerfil()` |
| `excluir` | Exclusão lógica | `excluirMovimentacao()` |
| `remover` | Exclusão física | `removerAnexo()` |
| `calcular` | Retorna número derivado | `calcularSaldoAtual()` |
| `validar` | Lança se inválido, sem retorno | `validarCompatibilidadeCategoria()` |
| `verificar` | Retorna booleano | `verificarSeEhMembro()` |
| `montar` | Constrói objeto auxiliar | `montarWhere()` |
| `gerar` | Produz múltiplos registros/artefatos | `gerarOcorrencias()` |

A distinção `buscar` (retorna `null`) × `obter` (lança) elimina a dúvida recorrente sobre quem é responsável por tratar a ausência — está no nome.

---

## 5. Padrões de código — TypeScript

### 5.1 Configuração

```jsonc
// tsconfig.json (base compartilhada)
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

`noUncheckedIndexedAccess` obriga a tratar `array[0]` como possivelmente `undefined`. É a opção que mais reclama e a que mais previne — em código financeiro, um `undefined` silencioso virando `NaN` é exatamente a falha que não se quer descobrir em produção.

### 5.2 Regras

**Tipos de retorno explícitos em toda função exportada.**

```ts
// ✅
export async function calcularSaldoAtual(contaId: string): Promise<Decimal> { }

// ❌ retorno inferido em API pública
export async function calcularSaldoAtual(contaId: string) { }
```

**`any` é proibido.** Use `unknown` e estreite. Exceção exige comentário justificando:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tipo de terceiro sem definição
const bruto = bibliotecaSemTipos.parse(entrada) as any;
```

**`type` para composição, `interface` para contrato extensível.** Na dúvida, `type`.

**Nunca `enum` do TypeScript.** Use os enums gerados pelo Prisma ou objetos `as const`:

```ts
export const SITUACOES_ATIVAS = ['PENDENTE', 'ATRASADA'] as const;
export type SituacaoAtiva = (typeof SITUACOES_ATIVAS)[number];
```

`enum` do TS gera código em tempo de execução e tem semântica surpreendente com valores numéricos. Os enums do Prisma já cobrem o domínio.

**Sem *default export*** (exceto onde a ferramenta exige: rotas Express, arquivos de configuração). *Named exports* permitem renomeação segura e busca confiável.

**Ordem dos imports** — aplicada automaticamente pelo ESLint:

```ts
// 1. builtins do Node
import { randomUUID } from 'node:crypto';
// 2. externos
import { Router } from 'express';
import { z } from 'zod';
// 3. internos por alias
import { MovimentacaoServico } from '@/servicos/movimentacao.servico';
// 4. relativos
import { montarWhere } from './auxiliares';
// 5. tipos
import type { Request, Response } from 'express';
```

### 5.3 Comentários

Comente **por que**, não **o que**. O código já diz o que faz.

```ts
// ❌ redundante
// incrementa o contador
contador += 1;

// ✅ explica a decisão
// A diferença de arredondamento vai para a última parcela, garantindo
// Σ parcelas === valorTotal exatamente (RN-21).
const ultimaParcela = valorTotal.minus(valorParcela.times(totalParcelas - 1));
```

Regras de negócio referenciam o identificador (`RN-21`) — quem lê o código chega à especificação, e quem altera a especificação encontra o código por busca.

`TODO` sem número de issue é rejeitado na revisão: `// TODO(#57): suportar multi-moeda`.

---

## 6. Padrões de código — Backend

### 6.1 Aritmética monetária

**Sempre `Prisma.Decimal`. Nunca `number`.**

```ts
import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;

// ✅
export function somarValores(valores: Prisma.Decimal[]): Prisma.Decimal {
  return valores.reduce((total, v) => total.plus(v), new Decimal(0));
}

// ✅ divisão com arredondamento explícito (RN-21)
export function ratearParcelas(valorTotal: Prisma.Decimal, quantidade: number): Prisma.Decimal[] {
  const base = valorTotal.dividedBy(quantidade).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const parcelas = Array.from({ length: quantidade - 1 }, () => base);
  const ultima = valorTotal.minus(base.times(quantidade - 1));
  return [...parcelas, ultima];
}

// ❌ NUNCA
const total = valores.reduce((a, b) => a + Number(b), 0);
```

Toda função de dinheiro recebe e devolve `Decimal`. A conversão para string acontece **apenas** na serialização da resposta.

### 6.2 Serialização de Decimal na resposta

```ts
// utilitarios/resposta.ts
export function respostaSucesso<T>(dados: T, mensagem: string, meta?: object) {
  return { success: true, message: mensagem, data: dados, ...(meta && { meta }) };
}
```

`Decimal` é convertido para string por um serializador central registrado no Express (`app.set('json replacer', ...)`), garantindo o formato `"1234.56"` de ADR-012 sem que cada controlador precise lembrar disso.

### 6.3 Transações

Toda operação que altera saldo ou escreve em mais de uma tabela usa transação:

```ts
async criarTransferencia(usuarioId: string, dados: CriarTransferenciaDTO) {
  return prisma.$transaction(async (tx) => {
    const transferenciaId = randomUUID();

    const saida = await tx.movimentacao.create({
      data: { ...comum, contaId: dados.contaOrigemId, sentido: 'SAIDA', transferenciaId },
    });

    const entrada = await tx.movimentacao.create({
      data: { ...comum, contaId: dados.contaDestinoId, sentido: 'ENTRADA', transferenciaId },
    });

    return { saida, entrada };
  });
}
```

O parâmetro `tx` é propagado até o repositório — repositórios aceitam um cliente transacional opcional:

```ts
async criar(dados: CriarMovimentacaoDados, tx?: Prisma.TransactionClient): Promise<Movimentacao> {
  return (tx ?? prisma).movimentacao.create({ data: dados });
}
```

Sem essa propagação, o repositório abriria uma conexão fora da transação e a atomicidade seria ilusória.

### 6.4 Validação com Zod

```ts
// validadores/movimentacao.validador.ts
export const criarMovimentacaoSchema = z.object({
  body: z.object({
    tipo: z.enum(['RECEITA', 'DESPESA']),
    descricao: z.string().trim().min(2).max(200),
    valor: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido. Use o formato 1234.56.')
      .refine((v) => Number(v) > 0, 'O valor deve ser maior que zero.'),
    dataCompetencia: z.string().date(),
    contaId: z.string().cuid().optional(),
    contaCompartilhadaId: z.string().cuid().optional(),
    cartaoId: z.string().cuid().optional(),
    categoriaId: z.string().cuid(),
    etiquetaIds: z.array(z.string().cuid()).max(10).optional(),
  })
  .refine(
    (d) => [d.contaId, d.contaCompartilhadaId, d.cartaoId].filter(Boolean).length === 1,
    { message: 'Informe exatamente um destino: contaId, contaCompartilhadaId ou cartaoId.', path: ['contaId'] },
  ),
});

export type CriarMovimentacaoDTO = z.infer<typeof criarMovimentacaoSchema>['body'];
```

O DTO é **inferido** do schema, nunca declarado à parte — um só lugar define a forma dos dados, e schema e tipo não podem divergir.

### 6.5 O que cada camada pode importar

| Camada | Pode importar | **Não** pode importar |
| ------ | ------------- | --------------------- |
| Rota | controlador, middleware, validador | serviço, repositório, `prisma` |
| Controlador | serviço, utilitário de resposta, tipos | repositório, `prisma` |
| Serviço | repositórios, outros serviços, erros, utilitários | `express`, `prisma`, `req`/`res` |
| Repositório | `prisma`, tipos | serviço, controlador, `express` |
| Middleware | utilitários, erros, serviço de autenticação | repositório de domínio |

Estas fronteiras são verificadas por `eslint-plugin-boundaries` — violação reprova o CI, não depende de vigilância humana em revisão.

---

## 7. Padrões de código — Frontend

### 7.1 Estrutura de componente

```tsx
// funcionalidades/movimentacoes/componentes/CartaoMovimentacao.tsx
import { formatarMoeda, formatarData } from '@/utilitarios/formatadores';
import type { Movimentacao } from '../tipos';

interface CartaoMovimentacaoProps {
  movimentacao: Movimentacao;
  onEditar?: (id: string) => void;
}

export function CartaoMovimentacao({ movimentacao, onEditar }: CartaoMovimentacaoProps) {
  const ehReceita = movimentacao.tipo === 'RECEITA';
  const corValor = ehReceita ? 'text-sucesso' : 'text-perigo';

  return (
    <article className="flex items-center gap-3 rounded-md border border-borda bg-superficie p-4">
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium text-texto">{movimentacao.descricao}</h3>
        <p className="text-sm text-textoSuave">
          {formatarData(movimentacao.dataCompetencia)} · {movimentacao.categoria?.nome ?? 'Sem categoria'}
        </p>
      </div>
      <span className={`font-mono tabular-nums ${corValor}`}>
        {/* O sinal acompanha a cor: acessibilidade não depende de cor (A11Y-01) */}
        {ehReceita ? '+' : '−'} {formatarMoeda(movimentacao.valor)}
      </span>
    </article>
  );
}
```

**Regras:**

1. Um componente exportado por arquivo. Subcomponentes privados podem coexistir se usados só ali.
2. Props sempre tipadas por `interface <Componente>Props`.
3. Componente com mais de ~150 linhas ou mais de um motivo para mudar deve ser dividido.
4. Nenhuma chamada de API dentro de componente — sempre via hook.
5. Nenhum cálculo financeiro em componente — sempre via `utilitarios/dinheiro.ts`.
6. Cor **nunca** é o único indicador de significado (A11Y-01).

### 7.2 Ordem interna do componente

```tsx
export function Componente({ props }: ComponenteProps) {
  // 1. hooks de contexto/roteamento
  // 2. hooks de estado local
  // 3. hooks de dados (React Query)
  // 4. hooks derivados (useMemo, useCallback)
  // 5. efeitos
  // 6. handlers
  // 7. retornos antecipados (carregando / erro / vazio)
  // 8. JSX principal
}
```

Os retornos antecipados **antes** do JSX principal mantêm o caminho felizes legível e evitam ternários aninhados na árvore.

### 7.3 Os quatro estados obrigatórios

```tsx
export function ListaMovimentacoes({ filtros }: ListaMovimentacoesProps) {
  const { data, isLoading, isError, error, refetch } = usarMovimentacoes(filtros);

  if (isLoading) return <EsqueletoLista quantidade={5} />;
  if (isError) return <EstadoErro mensagem={error.message} onTentarNovamente={refetch} />;
  if (!data?.movimentacoes.length) {
    return (
      <EstadoVazio
        titulo="Nenhuma movimentação encontrada"
        descricao="Ajuste os filtros ou registre sua primeira movimentação."
        acao={{ rotulo: 'Nova movimentação', onClick: abrirFormulario }}
      />
    );
  }

  return <ul>{data.movimentacoes.map((m) => <CartaoMovimentacao key={m.id} movimentacao={m} />)}</ul>;
}
```

Toda tela que carrega dados implementa os quatro. Falta de estado vazio ou de erro reprova a revisão.

### 7.4 Formulários

```tsx
const schema = z.object({
  descricao: z.string().min(2, 'Informe uma descrição.').max(200),
  valor: z.string().refine((v) => paraCentavos(v) > 0, 'O valor deve ser maior que zero.'),
  dataCompetencia: z.string().date('Data inválida.'),
  categoriaId: z.string().min(1, 'Selecione uma categoria.'),
});

type FormularioMovimentacao = z.infer<typeof schema>;

export function FormularioNovaMovimentacao({ onSucesso }: Props) {
  const form = useForm<FormularioMovimentacao>({
    resolver: zodResolver(schema),
    defaultValues: { descricao: '', valor: '', dataCompetencia: hojeIso(), categoriaId: '' },
  });

  const { mutate, isPending } = usarCriarMovimentacao();

  function onSubmit(valores: FormularioMovimentacao) {
    mutate(valores, { onSuccess: onSucesso });
  }
  // ...
}
```

Mensagens de validação são escritas em pt-BR, no schema, orientadas à ação ("Selecione uma categoria"), não ao formato interno ("categoriaId is required").

### 7.5 Tailwind

- Use os **tokens semânticos** (`bg-superficie`, `text-textoSuave`, `border-borda`), não cores cruas (`bg-slate-800`). Trocar a paleta deve exigir editar um arquivo, não trezentos.
- Mobile first: base sem prefixo, então `md:`, `lg:`, `xl:`.
- Classes condicionais via `cn()` (`clsx` + `tailwind-merge`), nunca concatenação de string.
- Repetição de mais de ~8 utilitários em 3+ lugares → extraia um componente, não uma classe CSS.

```tsx
<div className={cn('rounded-md p-4', ehDestaque && 'ring-2 ring-primaria', className)} />
```

### 7.6 Utilitários de dinheiro no frontend

```ts
// utilitarios/dinheiro.ts

/** Converte a string decimal da API para centavos inteiros. */
export function paraCentavos(valor: string): number {
  const [inteiro, decimal = '00'] = valor.split('.');
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, '0').slice(0, 2));
}

/** Converte centavos de volta para a string decimal da API. */
export function paraDecimalApi(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

export function formatarMoeda(valor: string, moeda = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda })
    .format(paraCentavos(valor) / 100);
}
```

Toda soma no cliente ocorre em centavos inteiros. `paraCentavos(a) + paraCentavos(b)` é exato; `Number(a) + Number(b)` não é.

---

## 8. Lint e formatação

### 8.1 Prettier — `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

`endOfLine: "lf"` mais `.gitattributes` com `* text=auto eol=lf` evita o clássico *diff* inteiro de fim de linha entre Windows e Linux.

### 8.2 ESLint — regras que reprovam o build

| Regra | Motivo |
| ----- | ------ |
| `@typescript-eslint/no-explicit-any` | Ver §5.2 |
| `@typescript-eslint/no-floating-promises` | Promise sem `await` engole erro silenciosamente |
| `@typescript-eslint/await-thenable` | `await` em não-promise indica erro de raciocínio |
| `@typescript-eslint/explicit-function-return-type` (exportadas) | Contrato explícito |
| `@typescript-eslint/no-unused-vars` (`argsIgnorePattern: "^_"`) | Código morto |
| `no-console` (`allow: ["warn", "error"]`) | Log estruturado é obrigatório; `console.log` não é log |
| `eqeqeq` | `==` tem coerção surpreendente |
| `no-restricted-imports` | Proíbe `process.env` fora de `configuracao/ambiente.ts` e `prisma` fora de `repositorios/` |
| `boundaries/element-types` | Aplica as fronteiras de camada de §6.5 |
| `import/order` | Ordem de §5.2 |
| `react-hooks/exhaustive-deps` | Dependências faltantes causam bug de estado velho |
| `jsx-a11y/*` (recommended) | Base de acessibilidade |

`--max-warnings 0`: *warning* é erro. *Warning* tolerado acumula até ninguém mais ler a saída do lint.

### 8.3 Git hooks (Husky + lint-staged)

```jsonc
// package.json (raiz)
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix --max-warnings 0", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"],
    "*.prisma": ["prisma format"]
  }
}
```

| Hook | Ação |
| ---- | ---- |
| `pre-commit` | `lint-staged` |
| `commit-msg` | `commitlint --edit` |
| `pre-push` | `npm run tipos && npm run teste:unitario` |

Hooks aceleram, não substituem o CI. `--no-verify` só é aceitável com justificativa no PR.

---

## 9. Fluxo Git

### 9.1 Branches

| Branch | Papel | Proteção |
| ------ | ----- | -------- |
| `main` | **Produção.** Todo merge dispara deploy automático | PR obrigatório, CI verde, 1 aprovação, sem *force push* |
| `staging` | **Desenvolvimento/homologação.** Integração contínua do trabalho | CI verde, sem *force push* |

Apenas essas duas são permanentes (ADR-011).

Branches de trabalho são **efêmeras**, criadas a partir de `staging` e excluídas após o merge:

```
issue/<numero>-<slug-curto>       # padrão para qualquer issue
hotfix/<numero>-<slug-curto>      # correção urgente, sai de main
```

Exemplos: `issue/42-criar-movimentacoes`, `issue/57-corrigir-saldo-parcial`, `hotfix/88-erro-login`.

### 9.2 Fluxo normal

```mermaid
gitGraph
    commit id: "base"
    branch staging
    commit id: "M1 inicio"
    branch issue/12-autenticacao
    commit id: "feat: entrar"
    commit id: "test: entrar"
    checkout staging
    merge issue/12-autenticacao
    commit id: "M1 completa"
    checkout main
    merge staging tag: "v1.1.0 → deploy"
```

```bash
# 1. Partir de staging atualizada
git checkout staging && git pull origin staging

# 2. Branch da issue
git checkout -b issue/42-criar-movimentacoes

# 3. Trabalhar, commitando em incrementos coerentes
git add -p
git commit -m "feat(movimentacoes): cria endpoint de listagem com filtros"

# 4. Antes de abrir o PR
npm run verificar
git fetch origin && git rebase origin/staging

# 5. Push e PR → staging
git push -u origin issue/42-criar-movimentacoes
```

*Rebase* em cima de `staging` antes do PR (em vez de merge) mantém o histórico linear e o *diff* do PR contendo só o que a issue mudou.

### 9.3 Fechamento de Milestone

Concluída a Milestone em `staging` e validada em homologação:

```bash
git checkout staging && git pull
git checkout main && git pull
# PR: staging → main, título "release: Milestone N — <nome>"
```

O merge em `main` dispara o pipeline de produção (build → testes → imagem → deploy SSH → *health check* → *rollback* se falhar). Ver [08-CICD.md](08-CICD.md).

Depois do merge, marque a tag:

```bash
git checkout main && git pull
git tag -a v1.1.0 -m "Milestone 6 — Contas Compartilhadas"
git push origin v1.1.0
```

### 9.4 Hotfix

```bash
git checkout main && git pull
git checkout -b hotfix/88-erro-login
# corrige + teste que reproduz o bug
git push -u origin hotfix/88-erro-login
# PR → main (deploy)  E EM SEGUIDA  PR → staging (evita regressão)
```

O segundo PR não é opcional. Um hotfix que só entra em `main` volta a quebrar no próximo release de `staging`.

### 9.5 Estratégia de merge

| Merge | Estratégia | Motivo |
| ----- | ---------- | ------ |
| `issue/*` → `staging` | **Squash** | Um commit por issue: histórico de `staging` legível, um item por entrega |
| `staging` → `main` | **Merge commit** | Preserva os commits da Milestone e marca o release |
| `hotfix/*` → `main` | **Squash** | Correção pontual |

O commit de squash usa o título do PR — que segue Conventional Commits, com `Closes #42` no corpo.

---

## 10. Conventional Commits

### 10.1 Formato

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

### 10.2 Tipos

| Tipo | Uso |
| ---- | --- |
| `feat` | Nova funcionalidade |
| `fix` | Correção de defeito |
| `docs` | Somente documentação |
| `refactor` | Reestruturação sem mudança de comportamento |
| `test` | Adição ou correção de testes |
| `chore` | Manutenção sem efeito em código de produção |
| `perf` | Melhoria de desempenho |
| `style` | Formatação, sem efeito em lógica |
| `build` | Build, dependências, Docker |
| `ci` | Pipelines e automação |
| `revert` | Reversão de commit anterior |

### 10.3 Escopos

`autenticacao`, `perfil`, `contas`, `categorias`, `etiquetas`, `movimentacoes`, `transferencias`, `anexos`, `cartoes`, `faturas`, `compartilhadas`, `convites`, `metas`, `orcamentos`, `notificacoes`, `dashboard`, `relatorios`, `pesquisa`, `auditoria`, `banco`, `api`, `ui`, `infra`, `docs`, `deps`.

### 10.4 Regras

1. Descrição em **pt-BR**, imperativo, minúscula, sem ponto final.
2. Máximo 72 caracteres na primeira linha.
3. Corpo explica **por que**, não o que — o *diff* já mostra o que.
4. Um commit = uma mudança coerente. "correções diversas" não é commit.
5. Mudança incompatível: `!` após o escopo **e** rodapé `BREAKING CHANGE:`.
6. Referencie a issue no rodapé: `Closes #42` ou `Refs #42`.

### 10.5 Exemplos

```bash
feat(movimentacoes): adiciona filtro por etiqueta na listagem

fix(contas): corrige saldo com pagamento parcial

O cálculo somava `valor` em vez de `valorPago`, inflando o saldo de
contas com despesas PAGA_PARCIALMENTE (RN-03).

Closes #57

refactor(servicos): extrai calculo de saldo para utilitario de dinheiro

test(transferencias): cobre exclusao atomica do par de lancamentos

perf(banco): adiciona indice parcial para agregacao de saldo

Reduz a consulta de saldo consolidado de 340 ms para 47 ms em base
com 50 mil movimentacoes.

feat(api)!: renomeia campo `data` para `dataCompetencia` em movimentacoes

BREAKING CHANGE: clientes que enviam `data` devem passar a usar
`dataCompetencia`. Ver 04-API.md §12.2.

docs(api): documenta endpoints de contas compartilhadas

chore(deps): atualiza prisma para 6.2.0

ci(deploy): adiciona rollback automatico apos health check falho
```

### 10.6 O que não fazer

```bash
❌ ajustes
❌ WIP
❌ correções
❌ feat: Adiciona Movimentações.        # maiúscula, ponto final
❌ update movimentacao.servico.ts       # descreve arquivo, não mudança
❌ fix: corrige bug                     # qual bug?
❌ feat: adiciona movimentacoes, corrige saldo e atualiza README   # três commits
```

### 10.7 commitlint

```js
// commitlint.config.cjs
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat','fix','docs','refactor','test','chore','perf','style','build','ci','revert']],
    'scope-enum': [2, 'always', [/* lista de §10.3 */]],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

---

## 11. Pull Requests e revisão

### 11.1 Template — `.github/pull_request_template.md`

```markdown
## Descrição
<!-- O que muda e por quê. -->

## Issue
Closes #

## Tipo
- [ ] feat  - [ ] fix  - [ ] refactor  - [ ] docs  - [ ] test  - [ ] chore

## Checklist técnico
- [ ] `npm run verificar` passa no backend
- [ ] `npm run verificar` passa no frontend
- [ ] Testes cobrem o comportamento novo (feliz + limites + erro)
- [ ] Cobertura não caiu
- [ ] Migrations revisadas (SQL lido, não só o schema)
- [ ] `04-API.md` atualizado se o contrato mudou
- [ ] Regras de negócio referenciadas por ID (RN-xx) no código
- [ ] Sem `console.log`, `TODO` sem issue, `any` sem justificativa
- [ ] Estados de carregando/vazio/erro implementados (frontend)
- [ ] Invalidação de cache em cascata revisada (frontend)
- [ ] Testado em 320 px, 768 px e 1440 px (frontend)
- [ ] Acessibilidade: teclado, contraste, rótulos

## Critérios de aceite da issue
<!-- Copie da issue e marque. -->

## Como testar
1.
2.

## Evidências
<!-- Prints ou vídeo para mudanças de UI. Antes/depois. -->

## Risco e rollback
<!-- O que pode quebrar; como reverter. -->
```

### 11.2 Roteiro de revisão

Em ordem de prioridade — o revisor gasta o tempo onde há mais risco:

1. **Correção da regra de negócio.** A regra está implementada como a especificação define? Casos-limite (zero, negativo, arredondamento, virada de mês, *timezone*)?
2. **Segurança e autorização.** Todo acesso valida propriedade no **serviço**? Nenhuma decisão de segurança depende do frontend?
3. **Integridade financeira.** Escritas múltiplas em transação? `Decimal` em toda aritmética? Nenhum `Number()` em dinheiro?
4. **Fronteiras de camada.** `prisma` só em repositório? Nenhuma regra em controlador?
5. **Testes.** Cobrem caminho feliz, limites e erros — ou apenas o feliz?
6. **Desempenho.** Consulta N+1? Listagem sem paginação? `Seq Scan` em `movimentacoes`?
7. **Contrato.** Resposta idêntica ao documentado em `04-API.md`?
8. **Legibilidade.** Nomes conforme §4? Comentários explicam *por que*?

### 11.3 Requisitos de merge

- CI verde (tipos, lint, formatação, testes, cobertura, build).
- 1 aprovação (`staging`); 1 aprovação e verificação em homologação (`main`).
- Sem conversas pendentes.
- Branch atualizada com a base.
- Branch excluída após o merge.

---

## 12. Estratégia de testes

### 12.1 Pirâmide

```
        ╱╲       E2E (Playwright) — ~10 fluxos críticos
       ╱  ╲      Login, criar despesa, transferir, convidar membro,
      ╱────╲     pagar fatura, fechar orçamento
     ╱      ╲
    ╱ Integr. ╲  Integração (Vitest + Supertest + Postgres real) — ~40%
   ╱   ação    ╲ Rotas ponta a ponta, autorização, transações, constraints
  ╱────────────╲
 ╱   Unitários   ╲ Unitários (Vitest) — ~55%
╱─────────────────╲ Serviços com repositórios mockados, utilitários de
                    dinheiro/data, regras de negócio isoladas
```

### 12.2 Metas de cobertura

| Escopo | Mínimo |
| ------ | ------ |
| Global (*statements*) | 80% |
| Global (*branches*) | 75% |
| `src/servicos/**` | **90%** |
| `src/utilitarios/dinheiro.ts` | **100%** |
| `src/utilitarios/data.ts` | **100%** |

Serviços e utilitários de dinheiro/data recebem exigência maior porque é onde um erro produz valor errado — o dano mais grave que este sistema pode causar.

### 12.3 Padrão de teste unitário

```ts
// testes/unitarios/servicos/movimentacao.servico.spec.ts
describe('MovimentacaoServico.criar', () => {
  let servico: MovimentacaoServico;
  let contaRepositorio: MockProxy<ContaRepositorio>;

  beforeEach(() => {
    contaRepositorio = mock<ContaRepositorio>();
    servico = new MovimentacaoServico(contaRepositorio, /* ... */);
  });

  it('cria despesa quando os dados são válidos', async () => {
    contaRepositorio.buscarPorId.mockResolvedValue(fabricarConta({ usuarioId: 'u1' }));

    const resultado = await servico.criar('u1', fabricarDadosDespesa());

    expect(resultado.tipo).toBe('DESPESA');
  });

  it('lança ProibidoErro quando a conta é de outro usuário (RN-51)', async () => {
    contaRepositorio.buscarPorId.mockResolvedValue(fabricarConta({ usuarioId: 'OUTRO' }));

    await expect(servico.criar('u1', fabricarDadosDespesa()))
      .rejects.toThrow(ProibidoErro);
  });

  it('lança RegraNegocioErro quando a categoria é de tipo incompatível (RN-10)', async () => {
    // ...
  });
});
```

**Convenções:** nome de teste descreve **comportamento**, não implementação; um `expect` conceitual por teste; regra de negócio testada cita o ID; dados vêm de *factories* (`testes/fabricas/`), nunca literais duplicados.

### 12.4 Padrão de teste de integração

```ts
describe('POST /api/v1/movimentacoes', () => {
  beforeEach(async () => { await limparBanco(); });

  it('retorna 201 e persiste a movimentação', async () => {
    const { token, conta, categoria } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'DESPESA', descricao: 'Mercado', valor: '150.00',
              dataCompetencia: '2026-07-15', contaId: conta.id, categoriaId: categoria.id });

    expect(resposta.status).toBe(201);
    expect(resposta.body.success).toBe(true);
    expect(resposta.body.data.movimentacao.valor).toBe('150.00');   // string, ADR-012
  });

  it('retorna 404 ao usar conta de outro usuário', async () => {
    const { token } = await prepararUsuarioComConta();
    const outro = await prepararUsuarioComConta();

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ /* ... */ contaId: outro.conta.id });

    expect(resposta.status).toBe(404);          // 404, não 403 (RN-51)
    expect(resposta.body.codigo).toBe('NAO_ENCONTRADO');
  });
});
```

Testes de integração usam **PostgreSQL real** na porta 5433, não SQLite nem mock. `CHECK` constraints, tipos `Decimal` e comportamento transacional só se verificam no banco de verdade.

### 12.5 Casos-limite obrigatórios em código financeiro

Toda alteração em cálculo de dinheiro ou data deve cobrir:

| Categoria | Casos |
| --------- | ----- |
| Valores | `0.01`, `0.00` (rejeitado), negativo (rejeitado), `999999999999.99`, três casas decimais (rejeitado) |
| Arredondamento | `1000/3`, `100/7`, `0.05/2`, `10/4` — verificando `Σ parcelas = total` |
| Datas | virada de mês, virada de ano, 29/02 em ano bissexto, dia 31 em mês de 30 dias, horário de verão |
| Fatura | compra no dia exato do fechamento, `diaFechamento = 31` em fevereiro |
| Situação | pagamento parcial, estorno, pagamento duplo (rejeitado) |
| Escopo | recurso de outro usuário, recurso de grupo sem ser membro, papel insuficiente |
| Concorrência | duas transferências simultâneas na mesma conta |

### 12.6 E2E (Playwright)

Dez fluxos, executados contra a aplicação real com banco dedicado:

1. Cadastro → verificação de e-mail → login
2. Criar conta financeira e conferir saldo inicial
3. Registrar despesa e conferir atualização do saldo
4. Registrar receita recorrente e conferir ocorrências geradas
5. Transferir entre contas e conferir os dois extratos
6. Criar compra parcelada em 10× e conferir soma das parcelas
7. Criar grupo, convidar, aceitar, lançar despesa como participante
8. Pagar fatura de cartão e conferir o saldo da conta pagadora
9. Definir orçamento, estourar o limite e conferir alerta
10. Filtrar movimentações e exportar CSV

---

## 13. Definição de Pronto

Uma issue só é fechada quando **todos** os itens são verdadeiros:

- [ ] Todos os critérios de aceite da issue atendidos.
- [ ] Código segue as convenções deste documento.
- [ ] Testes unitários e de integração escritos e passando.
- [ ] Cobertura mantida ou aumentada.
- [ ] `npm run verificar` passa nos dois pacotes afetados.
- [ ] Regras de negócio citadas por ID no código.
- [ ] `04-API.md` atualizado se o contrato mudou.
- [ ] Migration revisada, aplicada e reversível (ou com plano de duas fases).
- [ ] Frontend: responsivo em 320/768/1440 px; estados carregando/vazio/erro; teclado e contraste verificados.
- [ ] Sem código morto, `console.log`, `TODO` sem issue ou `any` sem justificativa.
- [ ] PR revisado e aprovado.
- [ ] Merge em `staging` e verificação em homologação.

---

## 14. Antipadrões proibidos

| # | Antipadrão | Por que é proibido |
| - | ---------- | ------------------ |
| 1 | `Number()` ou `parseFloat()` em valor monetário | Perda de precisão. Use `Decimal` / centavos inteiros (ADR-012) |
| 2 | Regra de negócio em controlador | Impossível testar sem HTTP; duplica quando surge segundo *caller* |
| 3 | `prisma` fora de `repositorios/` | Rompe a camada; torna serviço não testável |
| 4 | `req`/`res` em serviço | Acopla domínio ao transporte |
| 5 | Autorização apenas no frontend | Não é segurança; é decoração |
| 6 | Múltiplas escritas sem transação | Estado financeiro parcialmente aplicado |
| 7 | Listagem sem paginação | Degradação garantida com o crescimento da base |
| 8 | Consulta em laço (N+1) | Use `include` ou consulta agregada |
| 9 | Saldo persistido como coluna de escrita direta | Divergência silenciosa e irrecuperável (ADR-005) |
| 10 | Mutação sem invalidar cache relacionado | Interface exibe saldo velho (ADR-010) |
| 11 | Dado de servidor copiado para Context/Redux | Duas fontes de verdade divergem |
| 12 | `catch (e) {}` vazio ou `catch` que só loga | Erro engolido; falha aparece longe da causa |
| 13 | Segredo no repositório ou no `.env` versionado | Vazamento permanente no histórico do Git |
| 14 | `stack trace` em resposta de produção | Vaza estrutura interna (RN-56) |
| 15 | Cor como único portador de significado | Reprova acessibilidade (A11Y-01) |
| 16 | Identificador com acento ou cedilha | Problemas de *tooling* e *encoding* (§4.2) |
| 17 | Componente React chamando `axios` direto | Impede cache, invalidação e teste |
| 18 | `useEffect` para buscar dados | React Query resolve; `useEffect` gera condição de corrida |
| 19 | `any` sem comentário justificando | Desliga o sistema de tipos onde ele mais serve |
| 20 | Commit "ajustes", "WIP", "correções" | Histórico inútil; impede `git bisect` |
| 21 | Editar migration já aplicada em `staging`/`main` | Divergência de estado entre ambientes |
| 22 | `prisma db push` em ambiente compartilhado | Altera schema sem registro de migration |
| 23 | Teste que cobre só o caminho feliz | O defeito vive nos limites |
| 24 | Mock de banco em teste de integração | Não valida `CHECK`, `Decimal` nem transação |

---

**Documentos relacionados:** [02-ARCHITECTURE.md](02-ARCHITECTURE.md) · [04-API.md](04-API.md) · [07-ISSUES.md](07-ISSUES.md) · [08-CICD.md](08-CICD.md) · [09-CLAUDE.md](09-CLAUDE.md)
