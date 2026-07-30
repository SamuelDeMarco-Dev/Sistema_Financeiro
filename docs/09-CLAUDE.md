# 09 — Instruções para o Claude Code

> **Documento:** Diretrizes de Geração de Código
> **Projeto:** Gerenciador de Finanças (PFM)
> **Versão:** 1.0.0 · **Data:** 2026-07-29 · **Status:** Vigente

Este documento é lido pelo Claude Code antes de gerar qualquer código neste repositório. Ele é **normativo**: o que está aqui prevalece sobre hábitos gerais de escrita de código.

---

## Sumário

1. [Contexto do projeto](#1-contexto-do-projeto)
2. [Ordem de leitura obrigatória](#2-ordem-de-leitura-obrigatória)
3. [Regras invioláveis](#3-regras-invioláveis)
4. [Fluxo de trabalho por issue](#4-fluxo-de-trabalho-por-issue)
5. [Templates de código](#5-templates-de-código)
6. [Checklist de autoverificação](#6-checklist-de-autoverificação)
7. [Erros que este projeto já sofreu](#7-erros-que-este-projeto-já-sofreu)
8. [Quando parar e perguntar](#8-quando-parar-e-perguntar)
9. [Comandos do projeto](#9-comandos-do-projeto)

---

## 1. Contexto do projeto

**Gerenciador de Finanças (PFM)** — plataforma web de gestão financeira pessoal **e compartilhada**. O diferencial é tratar finanças de grupo (casal, família, república, sócios) como recurso de primeira classe, no mesmo sistema das finanças individuais.

| Aspecto | Definição |
| ------- | --------- |
| Stack backend | Node.js 22 LTS · Express · TypeScript estrito · Prisma 6 · PostgreSQL 16 · Zod · Vitest |
| Stack frontend | React 18 · Vite 5 · TypeScript · TailwindCSS · Shadcn/UI · React Query v5 · React Hook Form · Recharts |
| Infra | Docker · PM2 cluster · Nginx · GitHub Actions · VPS Hostinger |
| Idioma do domínio | **pt-BR** — classes, pastas, entidades, tabelas, colunas, rotas |
| Arquitetura backend | Camadas: `rota → controlador → serviço → repositório → banco` |
| Arquitetura frontend | *Feature Based*: `funcionalidades/<dominio>/` autocontidas |

**Natureza do sistema.** Este é um sistema **financeiro**. Um erro de centavo é um defeito, não um arredondamento aceitável. Um saldo errado destrói a confiança do usuário no produto inteiro. Precisão e correção têm precedência sobre elegância, brevidade e velocidade de entrega.

---

## 2. Ordem de leitura obrigatória

Antes de escrever código, leia — **na ordem** — o que for pertinente à tarefa:

| # | Documento | Quando é obrigatório |
| - | --------- | -------------------- |
| 1 | [07-ISSUES.md](07-ISSUES.md) | **Sempre.** Localize a issue: ela é o contrato de escopo. |
| 2 | [05-DEVELOPMENT.md](05-DEVELOPMENT.md) | **Sempre.** Convenções, nomenclatura, antipadrões. |
| 3 | [02-ARCHITECTURE.md](02-ARCHITECTURE.md) | Sempre que criar arquivo novo ou tocar em camadas. |
| 4 | [01-SPECIFICATION.md](01-SPECIFICATION.md) §5–6 | Sempre que a issue citar `RF-xx` ou `RN-xx`. |
| 5 | [03-DATABASE.md](03-DATABASE.md) | Ao tocar em schema, migration, consulta ou índice. |
| 6 | [04-API.md](04-API.md) | Ao criar ou alterar endpoint, ou consumi-lo no frontend. |
| 7 | [08-CICD.md](08-CICD.md) | Ao tocar em Docker, workflow ou infraestrutura. |

**Não presuma.** Se a issue diz "conforme RN-21", abra a RN-21 e leia o texto. As regras deste projeto têm exceções e casos-limite que não são adivinháveis.

---

## 3. Regras invioláveis

Estas 20 regras não admitem exceção. Violá-las reprova o código, independentemente de o restante estar correto.

### 3.1 Dinheiro

**R1.** Todo valor monetário no backend é `Prisma.Decimal`. **Nunca** `number`, `Number()`, `parseFloat()` ou `+` aritmético.

```ts
// ✅
const total = valores.reduce((acc, v) => acc.plus(v), new Prisma.Decimal(0));

// ❌ REPROVA
const total = valores.reduce((acc, v) => acc + Number(v), 0);
```

**R2.** Valor monetário na API é **string decimal** com 2 casas: `"1234.56"`. Nunca `number` no JSON (ADR-012).

**R3.** No frontend, aritmética de dinheiro ocorre em **centavos inteiros**, via `utilitarios/dinheiro.ts`. `paraCentavos(a) + paraCentavos(b)` é exato; `Number(a) + Number(b)` não é.

**R4.** Divisão de dinheiro sempre com arredondamento explícito e resto atribuído deliberadamente. Em parcelamento, o resto vai para a **última** parcela e `Σ parcelas === valorTotal` é invariante testada (RN-21).

### 3.2 Camadas

**R5.** `prisma` é importado **exclusivamente** em `repositorios/` e `banco/`. Serviço que importa `prisma` está errado por construção.

**R6.** `req`, `res`, `Request`, `Response` e qualquer tipo do Express **não** aparecem em `servicos/`.

**R7.** Regra de negócio (`if` que decide algo do domínio, cálculo, validação de estado) **não** aparece em controlador nem em componente React.

**R8.** Controlador chama **um** serviço. Precisando de dois, a orquestração pertence a um serviço.

**R9.** Nenhuma camada chama uma camada acima de si. O fluxo é sempre descendente.

### 3.3 Integridade

**R10.** Toda operação que escreve em mais de uma tabela, ou que altera saldo, roda em `prisma.$transaction`. O `tx` é propagado até o repositório.

**R11.** Saldo é **sempre** calculado a partir das movimentações. É proibido criar coluna de saldo com escrita direta (ADR-005, RN-06).

**R12.** Autorização é verificada na **camada de serviço**. Verificação apenas no frontend não é segurança.

**R13.** Recurso de outro usuário responde `404`, não `403` — `403` confirmaria a existência do recurso a quem não pode vê-lo (RN-51).

**R14.** Toda entrada externa passa por *schema* Zod na borda. O DTO é **inferido** do schema (`z.infer`), nunca declarado à parte.

### 3.4 Nomenclatura

**R15.** Domínio em pt-BR; palavras-chave e APIs de bibliotecas em inglês. Consulte o dicionário em [01-SPECIFICATION.md §4](01-SPECIFICATION.md#4-glossário-e-dicionário-de-domínio) — nome novo entra no dicionário antes de entrar no código.

**R16.** Identificadores usam **apenas ASCII**: `movimentacao`, não `movimentação`; `orcamento`, não `orçamento`. Acentuação só em texto exibido ao usuário.

**R17.** `buscar*` retorna `T | null`. `obter*` retorna `T` ou **lança**. A diferença está no nome e é respeitada.

### 3.5 Qualidade

**R18.** `any` é proibido. Use `unknown` e estreite. Exceção exige comentário `// eslint-disable-next-line ... -- <motivo>`.

**R19.** Toda listagem é paginada (padrão 20, máximo 100). Nenhuma consulta retorna coleção ilimitada.

**R20.** Toda mutação no frontend invalida em cascata as queries afetadas. Criar movimentação invalida `movimentacoes`, `contas`, `dashboard`, `relatorios` e, quando aplicável, `orcamentos`, `faturas`, `metas`. Saldo velho na tela é defeito de severidade alta.

---

## 4. Fluxo de trabalho por issue

### Passo 1 — Entender

1. Leia a issue completa em [07-ISSUES.md](07-ISSUES.md): descrição, checklist e critérios de aceite.
2. Abra cada `RF-xx`/`RN-xx` citado e leia o texto integral.
3. Se houver contrato de API, leia a seção correspondente em [04-API.md](04-API.md).
4. Confirme que as dependências (`Depende de: #N`) já estão implementadas. Se não estiverem, avise em vez de implementá-las de carona.

### Passo 2 — Explorar antes de escrever

Antes de criar um arquivo, verifique se já existe algo equivalente:

```bash
# Padrão de serviço já estabelecido
ls backend/src/servicos/

# Como um serviço similar resolve autorização
grep -rn "ProibidoErro" backend/src/servicos/

# Utilitários existentes (evita reimplementar)
ls backend/src/utilitarios/

# Padrão de hook no frontend
ls frontend/src/funcionalidades/*/hooks/
```

**Siga o padrão existente.** Consistência com o código vizinho vale mais que preferência pessoal.

### Passo 3 — Implementar

Ordem que minimiza retrabalho:

1. **Schema/migration** (se houver) — inclusive os `CHECK` de [03-DATABASE.md §6](03-DATABASE.md#6-constraints-não-expressáveis-no-prisma).
2. **Validador Zod** — define a forma dos dados e o DTO por inferência.
3. **Repositório** — acesso a dados, sem regra.
4. **Serviço** — regra de negócio, autorização, transações. Comente cada regra com seu ID (`// RN-10`).
5. **Controlador** — tradução HTTP.
6. **Rota** — declaração com middlewares.
7. **Testes** — caminho feliz, limites e erros.
8. **Frontend** — serviço → hooks → componentes → página.

### Passo 4 — Testar

Escreva os testes na mesma entrega, nunca "depois". Para cada comportamento:

- **Caminho feliz** — funciona com dados válidos.
- **Limites** — zero, negativo, máximo, arredondamento, virada de mês, ano bissexto.
- **Erros** — cada `4xx` documentado no contrato.
- **Autorização negativa** — recurso de outro usuário, papel insuficiente.

Teste que cobre só o caminho feliz é teste incompleto. O defeito vive nos limites.

### Passo 5 — Verificar

```bash
cd backend  && npm run verificar
cd frontend && npm run verificar
```

Depois, percorra o [checklist de autoverificação](#6-checklist-de-autoverificação) e os critérios de aceite da issue, um por um.

### Passo 6 — Commitar

Um commit por mudança coerente, em [Conventional Commits](05-DEVELOPMENT.md#10-conventional-commits) pt-BR:

```
feat(movimentacoes): adiciona pagamento parcial de despesa

O saldo passa a considerar `valorPago` em vez de `valor` para
movimentações PAGA_PARCIALMENTE (RN-03).

Closes #37
```

---

## 5. Templates de código

Copie estes esqueletos e adapte. Eles já refletem todas as regras da §3.

### 5.1 Validador

```ts
// backend/src/validadores/movimentacao.validador.ts
import { z } from 'zod';

const valorMonetario = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, 'Valor inválido. Use o formato 1234.56.')
  .refine((v) => Number(v) > 0, 'O valor deve ser maior que zero.');  // RN-08

export const criarMovimentacaoSchema = z.object({
  body: z
    .object({
      tipo: z.enum(['RECEITA', 'DESPESA']),
      descricao: z.string().trim().min(2).max(200),
      valor: valorMonetario,
      dataCompetencia: z.string().date(),
      contaId: z.string().cuid().optional(),
      contaCompartilhadaId: z.string().cuid().optional(),
      cartaoId: z.string().cuid().optional(),
      categoriaId: z.string().cuid(),
    })
    .refine(
      (d) => [d.contaId, d.contaCompartilhadaId, d.cartaoId].filter(Boolean).length === 1,
      {
        message: 'Informe exatamente um destino: contaId, contaCompartilhadaId ou cartaoId.',
        path: ['contaId'],
      },
    ),  // RN-09
});

export type CriarMovimentacaoDTO = z.infer<typeof criarMovimentacaoSchema>['body'];
```

### 5.2 Repositório

```ts
// backend/src/repositorios/movimentacao.repositorio.ts
import { Prisma } from '@prisma/client';
import { prisma } from '@/banco/cliente';
import type { Movimentacao } from '@prisma/client';

export class MovimentacaoRepositorio {
  async buscarPorId(id: string): Promise<Movimentacao | null> {
    return prisma.movimentacao.findFirst({
      where: { id, excluidoEm: null },
      include: { conta: true, categoria: true },
    });
  }

  async criar(
    dados: Prisma.MovimentacaoUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Movimentacao> {
    return (tx ?? prisma).movimentacao.create({
      data: dados,
      include: { conta: true, categoria: true, etiquetas: { include: { etiqueta: true } } },
    });
  }

  /** Filtro base aplicado a TODA consulta de domínio. */
  private filtroBase(): Prisma.MovimentacaoWhereInput {
    return { excluidoEm: null, ehModeloRecorrencia: false };  // RN-16, RN-17
  }
}
```

O `tx` opcional não é detalhe estilístico: sem ele, o repositório abriria conexão fora da transação e a atomicidade seria ilusória.

### 5.3 Serviço

```ts
// backend/src/servicos/movimentacao.servico.ts
import { prisma } from '@/banco/cliente';
import { MovimentacaoRepositorio } from '@/repositorios/movimentacao.repositorio';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import { CategoriaRepositorio } from '@/repositorios/categoria.repositorio';
import { NaoEncontradoErro, RegraNegocioErro } from '@/erros';
import type { CriarMovimentacaoDTO } from '@/validadores/movimentacao.validador';
import type { Categoria, Movimentacao, TipoMovimentacao } from '@prisma/client';

export class MovimentacaoServico {
  constructor(
    private readonly repositorio = new MovimentacaoRepositorio(),
    private readonly contaRepositorio = new ContaRepositorio(),
    private readonly categoriaRepositorio = new CategoriaRepositorio(),
  ) {}

  async criar(usuarioId: string, dados: CriarMovimentacaoDTO): Promise<Movimentacao> {
    const conta = await this.contaRepositorio.buscarPorId(dados.contaId!);

    // RN-51: recurso fora do escopo responde 404, nunca 403
    if (!conta || conta.usuarioId !== usuarioId) {
      throw new NaoEncontradoErro('Conta não encontrada.');
    }
    if (conta.arquivadaEm) {
      throw new RegraNegocioErro('Esta conta está arquivada e não aceita novos lançamentos.');
    }

    const categoria = await this.categoriaRepositorio.buscarPorId(dados.categoriaId);
    if (!categoria) throw new NaoEncontradoErro('Categoria não encontrada.');

    this.validarCompatibilidadeCategoria(categoria, dados.tipo);

    return prisma.$transaction((tx) =>
      this.repositorio.criar({ ...dados, usuarioId }, tx),
    );  // RN-55
  }

  /** RN-10: o tipo da categoria deve ser compatível com o tipo da movimentação. */
  private validarCompatibilidadeCategoria(
    categoria: Categoria,
    tipo: TipoMovimentacao,
  ): void {
    if (categoria.tipo === 'AMBOS') return;
    if (categoria.tipo !== tipo) {
      throw new RegraNegocioErro(
        `A categoria "${categoria.nome}" aceita apenas movimentações de ${categoria.tipo}.`,
      );
    }
  }
}
```

Injeção por parâmetro com valor padrão no construtor mantém o serviço testável (mocks nos testes) sem exigir container de DI.

### 5.4 Controlador

```ts
// backend/src/controladores/movimentacao.controlador.ts
import { MovimentacaoServico } from '@/servicos/movimentacao.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type { Request, Response } from 'express';

export class MovimentacaoControlador {
  private readonly servico = new MovimentacaoServico();

  criar = async (req: Request, res: Response): Promise<void> => {
    const movimentacao = await this.servico.criar(req.usuario.id, req.body);

    res
      .status(201)
      .location(`/api/v1/movimentacoes/${movimentacao.id}`)
      .json(respostaSucesso({ movimentacao }, 'Movimentação criada com sucesso.'));
  };
}
```

Sem `try/catch`: o `asyncHandler` captura e o `tratadorErros` traduz. Duplicar isso no controlador só cria caminhos divergentes de tratamento.

### 5.5 Rota

```ts
// backend/src/rotas/movimentacoes.rotas.ts
import { Router } from 'express';
import { MovimentacaoControlador } from '@/controladores/movimentacao.controlador';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { validar } from '@/middlewares/validar.middleware';
import { criarMovimentacaoSchema } from '@/validadores/movimentacao.validador';

const rotas = Router();
const controlador = new MovimentacaoControlador();

rotas.use(autenticar);

rotas.post('/', validar(criarMovimentacaoSchema), controlador.criar);

export default rotas;
```

### 5.6 Teste unitário de serviço

```ts
// backend/testes/unitarios/servicos/movimentacao.servico.spec.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { MovimentacaoServico } from '@/servicos/movimentacao.servico';
import { NaoEncontradoErro, RegraNegocioErro } from '@/erros';
import { fabricarConta, fabricarCategoria, fabricarDadosDespesa } from '../../fabricas';

describe('MovimentacaoServico.criar', () => {
  let servico: MovimentacaoServico;
  let repositorio: MockProxy<MovimentacaoRepositorio>;
  let contaRepositorio: MockProxy<ContaRepositorio>;
  let categoriaRepositorio: MockProxy<CategoriaRepositorio>;

  beforeEach(() => {
    repositorio = mock();
    contaRepositorio = mock();
    categoriaRepositorio = mock();
    servico = new MovimentacaoServico(repositorio, contaRepositorio, categoriaRepositorio);
  });

  it('cria despesa quando os dados são válidos', async () => {
    contaRepositorio.buscarPorId.mockResolvedValue(fabricarConta({ usuarioId: 'u1' }));
    categoriaRepositorio.buscarPorId.mockResolvedValue(fabricarCategoria({ tipo: 'DESPESA' }));

    await servico.criar('u1', fabricarDadosDespesa());

    expect(repositorio.criar).toHaveBeenCalledOnce();
  });

  it('lança NaoEncontradoErro quando a conta é de outro usuário (RN-51)', async () => {
    contaRepositorio.buscarPorId.mockResolvedValue(fabricarConta({ usuarioId: 'OUTRO' }));

    await expect(servico.criar('u1', fabricarDadosDespesa()))
      .rejects.toThrow(NaoEncontradoErro);
  });

  it('lança RegraNegocioErro com categoria de tipo incompatível (RN-10)', async () => {
    contaRepositorio.buscarPorId.mockResolvedValue(fabricarConta({ usuarioId: 'u1' }));
    categoriaRepositorio.buscarPorId.mockResolvedValue(fabricarCategoria({ tipo: 'RECEITA' }));

    await expect(servico.criar('u1', fabricarDadosDespesa()))
      .rejects.toThrow(RegraNegocioErro);
  });
});
```

### 5.7 Hook do frontend

```ts
// frontend/src/funcionalidades/movimentacoes/hooks/usarMovimentacoes.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { movimentacaoServico } from '../servicos/movimentacao.servico';
import { chavesContas } from '@/funcionalidades/contas/hooks/chaves';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/chaves';
import { notificar } from '@/componentes/feedback/notificar';
import type { FiltroMovimentacao } from '../tipos';

export const chavesMovimentacoes = {
  todas: ['movimentacoes'] as const,
  lista: (filtros: FiltroMovimentacao) => ['movimentacoes', 'lista', filtros] as const,
  detalhe: (id: string) => ['movimentacoes', 'detalhe', id] as const,
};

export function usarMovimentacoes(filtros: FiltroMovimentacao) {
  return useQuery({
    queryKey: chavesMovimentacoes.lista(filtros),
    queryFn: () => movimentacaoServico.listar(filtros),
    staleTime: 30_000,
  });
}

export function usarCriarMovimentacao() {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: movimentacaoServico.criar,
    onSuccess: () => {
      // R20: invalidação em cascata — o saldo e os indicadores mudaram
      cliente.invalidateQueries({ queryKey: chavesMovimentacoes.todas });
      cliente.invalidateQueries({ queryKey: chavesContas.todas });
      cliente.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso('Movimentação criada com sucesso.');
    },
    onError: (erro) => notificar.erro(erro.message),
  });
}
```

### 5.8 Componente do frontend

```tsx
// frontend/src/funcionalidades/movimentacoes/componentes/ListaMovimentacoes.tsx
import { usarMovimentacoes } from '../hooks/usarMovimentacoes';
import { CartaoMovimentacao } from './CartaoMovimentacao';
import { EsqueletoLista, EstadoErro, EstadoVazio } from '@/componentes/feedback';
import type { FiltroMovimentacao } from '../tipos';

interface ListaMovimentacoesProps {
  filtros: FiltroMovimentacao;
  onNova: () => void;
}

export function ListaMovimentacoes({ filtros, onNova }: ListaMovimentacoesProps) {
  const { data, isLoading, isError, error, refetch } = usarMovimentacoes(filtros);

  // Os quatro estados obrigatórios, como retornos antecipados
  if (isLoading) return <EsqueletoLista quantidade={5} />;
  if (isError) return <EstadoErro mensagem={error.message} onTentarNovamente={refetch} />;
  if (!data?.movimentacoes.length) {
    return (
      <EstadoVazio
        titulo="Nenhuma movimentação encontrada"
        descricao="Ajuste os filtros ou registre sua primeira movimentação."
        acao={{ rotulo: 'Nova movimentação', onClick: onNova }}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.movimentacoes.map((movimentacao) => (
        <li key={movimentacao.id}>
          <CartaoMovimentacao movimentacao={movimentacao} />
        </li>
      ))}
    </ul>
  );
}
```

---

## 6. Checklist de autoverificação

Percorra antes de considerar a tarefa concluída.

### Sempre

- [ ] Todos os critérios de aceite da issue atendidos, um por um.
- [ ] `npm run verificar` passa nos pacotes tocados.
- [ ] Nenhum `console.log`, `any` sem justificativa, `TODO` sem número de issue ou código comentado.
- [ ] Nomes conforme o dicionário de domínio; identificadores sem acento.
- [ ] Cada regra de negócio implementada tem o ID no comentário (`// RN-21`).

### Backend

- [ ] `prisma` importado apenas em `repositorios/` e `banco/`.
- [ ] Nenhum `req`/`res` em serviço; nenhuma regra em controlador.
- [ ] Todo valor monetário é `Decimal`; zero ocorrências de `Number(` sobre dinheiro.
- [ ] Operação multi-escrita ou que altera saldo está em `$transaction`, com `tx` propagado.
- [ ] Autorização verificada no serviço; recurso de terceiro responde `404`.
- [ ] Entrada validada por Zod; DTO inferido do schema.
- [ ] Listagem paginada, com limite máximo aplicado.
- [ ] Resposta idêntica ao documentado em [04-API.md](04-API.md) — chaves, tipos e códigos de erro.
- [ ] Migration revisada no SQL gerado, não apenas no schema.
- [ ] Testes cobrem caminho feliz, limites e cada erro documentado.
- [ ] Consulta nova verificada com `EXPLAIN ANALYZE`, sem `Seq Scan` em `movimentacoes`.

### Frontend

- [ ] Nenhuma chamada de API fora de hook; nenhum `useEffect` para buscar dados.
- [ ] Nenhum cálculo de dinheiro fora de `utilitarios/dinheiro.ts`.
- [ ] Os quatro estados implementados: carregando, vazio, erro, conteúdo.
- [ ] Invalidação em cascata revisada em toda mutação.
- [ ] Tokens semânticos do Design System; nenhuma cor crua do Tailwind.
- [ ] Testado em 320 px, 768 px e 1440 px, sem *scroll* horizontal na página.
- [ ] Operável por teclado; `label` em todo campo; foco visível.
- [ ] Nenhuma informação transmitida **só** por cor — sempre com sinal, ícone ou texto.
- [ ] Nenhuma funcionalidade importada de outra `funcionalidades/*`.

---

## 7. Erros que este projeto já sofreu

Casos concretos com correção. Se estiver escrevendo algo parecido, pare e reveja.

### 7.1 Saldo somando `valor` em vez de `valorPago`

```ts
// ❌ Ignora pagamento parcial: despesa de 100 com 30 pagos reduz o saldo em 100
SUM(CASE WHEN tipo = 'DESPESA' THEN -valor END)

// ✅ RN-03
SUM(CASE WHEN tipo = 'DESPESA' THEN -valor_pago END)
```

### 7.2 Transferência entrando nos totais de despesa

```ts
// ❌ Transferir 200 do banco para a carteira aparece como 200 de despesa
where: { tipo: { in: ['RECEITA', 'DESPESA'] } }   // parece certo, mas...

// ✅ Use o helper único do repositório, que também exclui canceladas e modelos
where: this.filtroRelatorio(filtros)              // RN-25
```

### 7.3 Rateio de parcelas que não fecha

```ts
// ❌ 1000 / 3 → 333.33 × 3 = 999.99. Faltou um centavo.
const valorParcela = valorTotal.dividedBy(n).toDecimalPlaces(2);
return Array.from({ length: n }, () => valorParcela);

// ✅ RN-21: o resto vai para a última parcela
const base = valorTotal.dividedBy(n).toDecimalPlaces(2, Decimal.ROUND_DOWN);
const ultima = valorTotal.minus(base.times(n - 1));
return [...Array.from({ length: n - 1 }, () => base), ultima];
```

### 7.4 Modelo de recorrência aparecendo na listagem

```ts
// ❌ O registro-mãe é molde, não lançamento: aparece na lista e distorce o saldo
where: { usuarioId, excluidoEm: null }

// ✅ RN-17
where: { usuarioId, excluidoEm: null, ehModeloRecorrencia: false }
```

### 7.5 Mutação sem invalidar contas

```ts
// ❌ A lista atualiza, o saldo do cartão de conta continua o antigo
onSuccess: () => cliente.invalidateQueries({ queryKey: ['movimentacoes'] })

// ✅ R20
onSuccess: () => {
  cliente.invalidateQueries({ queryKey: chavesMovimentacoes.todas });
  cliente.invalidateQueries({ queryKey: chavesContas.todas });
  cliente.invalidateQueries({ queryKey: chavesDashboard.todas });
}
```

### 7.6 Autorização só no frontend

```tsx
// ❌ Esconder o botão não impede a requisição via curl
{ehAdministrador && <BotaoExcluir onClick={excluir} />}
```

O botão condicional está correto como UX, mas o serviço **também** precisa verificar o papel (R12). Frontend esconde; backend decide.

### 7.7 `403` revelando existência de recurso

```ts
// ❌ Confirma a existência da conta a quem não pode vê-la
if (conta.usuarioId !== usuarioId) throw new ProibidoErro('Acesso negado.');

// ✅ RN-51 — indistinguível de "não existe"
if (!conta || conta.usuarioId !== usuarioId) {
  throw new NaoEncontradoErro('Conta não encontrada.');
}
```

Use `ProibidoErro` apenas quando o usuário **pode** ver o recurso mas não pode executar a ação — papel insuficiente em grupo do qual ele é membro.

### 7.8 Fatura errada por um dia

```ts
// ❌ Compra no dia exato do fechamento cai na fatura errada
if (dataCompra.getDate() > diaFechamento) { /* ciclo seguinte */ }

// ✅ RN-40: a partir do dia do fechamento, inclusive, é o ciclo seguinte
if (dataCompra.getDate() >= diaFechamento) { /* ciclo seguinte */ }
```

### 7.9 Dia 31 em mês de 30 dias

```ts
// ❌ new Date(2026, 3, 31) → 1º de maio. O vencimento pula de mês.
const vencimento = new Date(ano, mes - 1, diaVencimento);

// ✅ RN-41
const ultimoDia = new Date(ano, mes, 0).getDate();
const vencimento = new Date(ano, mes - 1, Math.min(diaVencimento, ultimoDia));
```

### 7.10 Alerta de orçamento todos os dias

```ts
// ❌ A tarefa roda diariamente: o usuário recebe o mesmo alerta até o fim do mês
if (percentual >= 80) await criarNotificacao('ORCAMENTO_80', orcamento);

// ✅ RN-50 — a marca garante uma notificação por limiar por período
if (percentual >= 80 && !orcamento.alerta80EnviadoEm) {
  await criarNotificacao('ORCAMENTO_80', orcamento);
  await marcarAlertaEnviado(orcamento.id, 80);
}
```

### 7.11 Repositório fora da transação

```ts
// ❌ O repositório usa `prisma` global: o segundo insert não pertence à transação
await prisma.$transaction(async () => {
  await this.repositorio.criar(saida);
  await this.repositorio.criar(entrada);
});

// ✅ RN-26 — propague o tx
await prisma.$transaction(async (tx) => {
  await this.repositorio.criar(saida, tx);
  await this.repositorio.criar(entrada, tx);
});
```

### 7.12 Tarefa agendada rodando N vezes

```ts
// ❌ Com PM2 em cluster e 4 núcleos, a tarefa executa 4 vezes por dia
cron.schedule('5 0 * * *', marcarAtrasadas);

// ✅ Apenas a instância 0 agenda
if (process.env.NODE_APP_INSTANCE === '0' || !process.env.NODE_APP_INSTANCE) {
  cron.schedule('5 0 * * *', marcarAtrasadas);
}
```

---

## 8. Quando parar e perguntar

Interrompa e pergunte, em vez de decidir sozinho, quando:

| Situação | Por quê |
| -------- | ------- |
| A documentação **se contradiz** entre dois arquivos | Escolher um lado silenciosamente propaga a inconsistência. Aponte os dois trechos. |
| A issue exige algo que **viola** uma regra da §3 | Pode ser erro na issue ou exceção legítima — os dois exigem decisão explícita. |
| A regra de negócio tem um caso-limite **não coberto** pela especificação | Ex.: "e se o orçamento for criado no dia 31?". Pergunte em vez de inventar. |
| Falta uma **dependência** (`Depende de: #N` não implementada) | Implementar de carona estoura o escopo da issue e da revisão. |
| A implementação correta exige **mudança de contrato** de API | Contrato quebrado afeta o frontend. Precisa de decisão e atualização de `04-API.md`. |
| Uma migration seria **destrutiva** | Exige plano de duas fases ([03-DATABASE.md §9.1](03-DATABASE.md#91-regras)) e aprovação. |
| A tarefa parece exigir **arquitetura nova** (fila, cache distribuído, WebSocket) | Não está previsto. Pode haver solução mais simples dentro do que existe. |

Não pergunte, decida e siga, quando: o padrão está estabelecido no código vizinho; a convenção está em [05-DEVELOPMENT.md](05-DEVELOPMENT.md); é escolha de nome dentro do dicionário; é detalhe de implementação sem efeito no contrato.

---

## 9. Comandos do projeto

### Backend (`cd backend`)

```bash
npm run dev                # desenvolvimento com hot reload (porta 3333)
npm run verificar          # PORTÃO: tipos + lint + formato + testes
npm run tipos              # tsc --noEmit
npm run lint               # eslint --max-warnings 0
npm run lint:fix
npm run formatar
npm run teste              # todos os testes
npm run teste:observar     # modo watch
npm run teste:unitario
npm run teste:integracao
npm run teste:cobertura
npm run prisma:migrate -- --name <nome>   # nova migration (local)
npm run prisma:deploy      # aplica migrations
npm run prisma:studio      # UI do banco (porta 5555)
npm run seed
npm run build
```

### Frontend (`cd frontend`)

```bash
npm run dev                # Vite (porta 5173)
npm run verificar          # PORTÃO: tipos + lint + testes
npm run tipos
npm run lint
npm run teste
npm run teste:cobertura
npm run e2e                # Playwright
npm run build
npm run preview
```

### Ambiente

```bash
docker compose up -d                      # postgres + postgres_teste + mailpit
docker compose down
docker compose logs -f postgres
docker compose down -v                    # remove volumes (perde dados locais)
```

| Serviço | Endereço |
| ------- | -------- |
| API | http://localhost:3333 |
| Documentação da API | http://localhost:3333/api/docs |
| Frontend | http://localhost:5173 |
| Prisma Studio | http://localhost:5555 |
| Mailpit (e-mails capturados) | http://localhost:8025 |

---

## Resumo em uma frase

**Leia a issue e as regras que ela cita, siga o padrão do código vizinho, use `Decimal` para dinheiro, valide autorização no serviço, envolva escritas múltiplas em transação, invalide o cache em cascata, e teste os limites — não só o caminho feliz.**

---

**Documentos relacionados:** [01-SPECIFICATION.md](01-SPECIFICATION.md) · [02-ARCHITECTURE.md](02-ARCHITECTURE.md) · [03-DATABASE.md](03-DATABASE.md) · [04-API.md](04-API.md) · [05-DEVELOPMENT.md](05-DEVELOPMENT.md) · [07-ISSUES.md](07-ISSUES.md) · [08-CICD.md](08-CICD.md)
