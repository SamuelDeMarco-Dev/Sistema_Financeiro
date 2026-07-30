# 04 — Especificação da API REST

> **Documento:** Contrato de API
> **Projeto:** Gerenciador de Finanças (PFM)
> **Base URL:** `https://<dominio>/api/v1` · **Local:** `http://localhost:3333/api/v1`
> **OpenAPI:** `GET /api/docs`
> **Versão:** 1.0.0 · **Data:** 2026-07-29 · **Status:** Vigente

Este documento é o **contrato**. Divergência entre implementação e este documento é defeito — do código ou do documento — e resolve-se por issue, nunca por adaptação silenciosa de um dos lados.

---

## Sumário

1. [Convenções gerais](#1-convenções-gerais)
2. [Envelope de resposta](#2-envelope-de-resposta)
3. [Erros](#3-erros)
4. [Paginação, ordenação e filtros](#4-paginação-ordenação-e-filtros)
5. [Autenticação](#5-autenticação)
6. [Índice de endpoints](#6-índice-de-endpoints)
7. [Autenticação e sessão](#7-autenticação-e-sessão)
8. [Perfil](#8-perfil)
9. [Contas financeiras](#9-contas-financeiras)
10. [Categorias](#10-categorias)
11. [Etiquetas](#11-etiquetas)
12. [Movimentações](#12-movimentações)
13. [Transferências](#13-transferências)
14. [Anexos](#14-anexos)
15. [Cartões e faturas](#15-cartões-e-faturas)
16. [Contas compartilhadas](#16-contas-compartilhadas)
17. [Convites](#17-convites)
18. [Metas](#18-metas)
19. [Orçamentos](#19-orçamentos)
20. [Notificações](#20-notificações)
21. [Dashboard](#21-dashboard)
22. [Relatórios](#22-relatórios)
23. [Pesquisa global](#23-pesquisa-global)
24. [Auditoria](#24-auditoria)
25. [Saúde](#25-saúde)
26. [Rate limiting](#26-rate-limiting)

---

## 1. Convenções gerais

| Aspecto | Regra |
| ------- | ----- |
| Protocolo | HTTPS obrigatório em produção. HTTP apenas em `localhost`. |
| Versionamento | Prefixo de caminho `/api/v1`. Mudança incompatível cria `/api/v2`. |
| Formato | `application/json; charset=utf-8`. Exceções: upload (`multipart/form-data`) e download de anexo/exportação (binário). |
| Nomes de recurso | pt-BR, **plural**, `kebab-case`: `/movimentacoes`, `/contas-compartilhadas`. |
| Campos de domínio | pt-BR, `camelCase`: `dataCompetencia`, `contaCompartilhadaId`. |
| Campos de envelope | Inglês: `success`, `message`, `data`, `meta`, `errors` (ADR-004). |
| Identificadores | `string` (cuid). Nunca inteiro sequencial. |
| **Valores monetários** | **`string` decimal** com 2 casas: `"1234.56"`. Nunca `number` (ADR-012). Ponto como separador decimal, sem separador de milhar, sem símbolo de moeda. |
| Datas de calendário | `string` ISO-8601 **date**: `"2026-07-29"`. Sem hora, sem *timezone*. |
| Instantes | `string` ISO-8601 **datetime UTC**: `"2026-07-29T14:03:11.482Z"`. |
| Enums | `SCREAMING_SNAKE_CASE`, idênticos aos do banco ([03-DATABASE.md §3](03-DATABASE.md#3-enums)). |
| Campos nulos | Presentes com valor `null`. Campos ausentes em `PATCH` significam "não alterar". |
| Idempotência | `GET`, `PUT`, `PATCH` e `DELETE` são idempotentes. `POST` não é. |
| `PUT` vs `PATCH` | `PUT` substitui o recurso por completo; `PATCH` altera os campos enviados. Recursos de domínio usam `PATCH`. |
| Trailing slash | Não aceito. `/contas/` responde `404`. |

### 1.1 Por que valores monetários são string

`JSON.parse('{"valor": 1234.56}')` produz um `double`. Somar `0.1 + 0.2` nesse tipo dá `0.30000000000000004`. Em um sistema financeiro isso é defeito. Transportar como string preserva a precisão decimal de ponta a ponta; o backend converte para `Prisma.Decimal` e o frontend para inteiro de centavos, ambos na borda.

**Frontend:** nunca faça aritmética com o valor recebido antes de convertê-lo pelo utilitário `utilitarios/dinheiro.ts`.

### 1.2 Cabeçalhos

**Requisição**

| Cabeçalho | Obrigatório | Descrição |
| --------- | ----------- | --------- |
| `Authorization` | Sim (rotas privadas) | `Bearer <accessToken>` |
| `Content-Type` | Em corpo | `application/json` ou `multipart/form-data` |
| `Accept-Language` | Não | `pt-BR` (padrão) ou `en-US` |
| `X-Request-Id` | Não | Se omitido, o servidor gera. Ecoado na resposta. |

**Resposta**

| Cabeçalho | Descrição |
| --------- | --------- |
| `X-Request-Id` | Correlação com os logs do servidor. Inclua-o em qualquer relato de erro. |
| `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` | Estado do *rate limit* |
| `Retry-After` | Presente em `429` e `503` |

---

## 2. Envelope de resposta

### 2.1 Sucesso

```json
{
  "success": true,
  "message": "Movimentação criada com sucesso.",
  "data": { },
  "meta": { }
}
```

- `data` — o recurso ou a coleção. Sempre presente em `2xx`, exceto em `204`.
- `meta` — presente apenas quando há metadado (paginação, totalizadores).
- `message` — texto pt-BR exibível ao usuário. Nunca contém detalhe técnico.

**Recurso único** — `data` é o objeto nomeado:

```json
{ "success": true, "message": "Conta encontrada.", "data": { "conta": { "id": "clx...", "nome": "Banco Principal" } } }
```

**Coleção** — `data` traz o array nomeado no plural; `meta.paginacao` acompanha:

```json
{
  "success": true,
  "message": "Movimentações listadas com sucesso.",
  "data": { "movimentacoes": [] },
  "meta": {
    "paginacao": { "pagina": 1, "limite": 20, "total": 137, "totalPaginas": 7, "temProxima": true, "temAnterior": false },
    "totalizadores": { "receitas": "5400.00", "despesas": "3218.45", "resultado": "2181.55" }
  }
}
```

Nomear a coleção dentro de `data` (em vez de `data` ser o array direto) permite acrescentar campos irmãos depois sem quebrar o cliente.

### 2.2 Códigos de status

| Código | Uso |
| ------ | --- |
| `200 OK` | Leitura, atualização e ações bem-sucedidas |
| `201 Created` | Recurso criado. Inclui `Location` |
| `204 No Content` | Exclusão bem-sucedida. **Sem corpo** |
| `400 Bad Request` | Entrada malformada ou inválida |
| `401 Unauthorized` | Sem credencial válida |
| `403 Forbidden` | Autenticado, sem permissão |
| `404 Not Found` | Recurso inexistente **ou fora do escopo do usuário** |
| `409 Conflict` | Violação de unicidade ou estado incompatível |
| `413 Payload Too Large` | Upload acima do limite |
| `415 Unsupported Media Type` | `Content-Type` não aceito |
| `422 Unprocessable Entity` | Sintaticamente válido, regra de negócio violada |
| `429 Too Many Requests` | *Rate limit* |
| `500 Internal Server Error` | Falha inesperada |
| `503 Service Unavailable` | Banco indisponível ou *shutdown* em curso |

> **`404` em vez de `403` para recurso de outro usuário.** Responder `403` confirmaria a existência do recurso a quem não pode vê-lo. O `404` é deliberado (RN-51).

---

## 3. Erros

### 3.1 Formato

```json
{
  "success": false,
  "message": "Dados inválidos.",
  "codigo": "VALIDACAO",
  "errors": [
    { "campo": "valor",           "mensagem": "O valor deve ser maior que zero." },
    { "campo": "dataCompetencia", "mensagem": "Data inválida. Use o formato AAAA-MM-DD." }
  ]
}
```

`errors` está presente quando há detalhamento por campo; ausente em erros sem granularidade.

### 3.2 Catálogo de códigos

| Código | HTTP | Significado |
| ------ | ---- | ----------- |
| `VALIDACAO` | 400 | Entrada inválida |
| `NAO_AUTENTICADO` | 401 | Token ausente ou inválido |
| `TOKEN_EXPIRADO` | 401 | Access token expirado — **o cliente deve tentar renovar** |
| `CREDENCIAIS_INVALIDAS` | 401 | E-mail ou senha incorretos |
| `EMAIL_NAO_VERIFICADO` | 403 | Verificação de e-mail pendente |
| `CONTA_BLOQUEADA` | 403 | Bloqueio temporário por tentativas (RN-54) |
| `PROIBIDO` | 403 | Sem permissão para a ação |
| `PAPEL_INSUFICIENTE` | 403 | Papel no grupo não autoriza (RN-30) |
| `NAO_ENCONTRADO` | 404 | Recurso inexistente ou fora do escopo |
| `CONFLITO` | 409 | Violação de unicidade |
| `EMAIL_JA_CADASTRADO` | 409 | E-mail em uso |
| `RECURSO_EM_USO` | 409 | Não pode ser excluído por ter dependentes |
| `CONVITE_DUPLICADO` | 409 | Já existe convite pendente (RN-36) |
| `JA_E_MEMBRO` | 409 | Usuário já pertence ao grupo (RN-38) |
| `ARQUIVO_MUITO_GRANDE` | 413 | Acima do limite |
| `TIPO_ARQUIVO_INVALIDO` | 415 | MIME não aceito |
| `REGRA_NEGOCIO` | 422 | Regra de domínio violada |
| `SALDO_INSUFICIENTE` | 422 | Transferência acima do disponível (quando validado) |
| `CONTAS_IGUAIS` | 422 | Origem e destino coincidem (RN-24) |
| `CATEGORIA_INCOMPATIVEL` | 422 | Tipo de categoria ≠ tipo da movimentação (RN-10) |
| `CONTA_ARQUIVADA` | 422 | Conta arquivada não aceita lançamento |
| `CONVITE_EXPIRADO` | 422 | Prazo vencido (RN-35) |
| `ADMINISTRADOR_UNICO` | 422 | Ação deixaria o grupo sem administrador (RN-29) |
| `LIMITE_EXCEDIDO` | 429 | *Rate limit* |
| `ERRO_INTERNO` | 500 | Falha inesperada |
| `SERVICO_INDISPONIVEL` | 503 | Dependência fora do ar |

O cliente deve ramificar por `codigo`, **nunca** por `message` — a mensagem é texto de interface e pode mudar.

---

## 4. Paginação, ordenação e filtros

### 4.1 Paginação

| Parâmetro | Tipo | Padrão | Limites |
| --------- | ---- | ------ | ------- |
| `pagina` | int | `1` | ≥ 1 |
| `limite` | int | `20` | 1–100 |

Valor acima de 100 responde `400 VALIDACAO` — não é silenciosamente truncado, para que o cliente saiba que sua expectativa não foi atendida.

### 4.2 Ordenação

`ordenarPor=<campo>&ordem=asc|desc`. Padrão por recurso, documentado em cada seção. Campos permitidos são uma lista fechada por recurso; campo fora dela responde `400`.

### 4.3 Filtros comuns

| Parâmetro | Tipo | Descrição |
| --------- | ---- | --------- |
| `dataInicio` / `dataFim` | date | Intervalo inclusivo sobre a data de referência do recurso |
| `busca` | string | Texto livre; mínimo 2 caracteres |
| `contaId`, `categoriaId`, `cartaoId` | string | Aceita repetição para OU: `?categoriaId=a&categoriaId=b` |
| `tipo`, `situacao` | enum | Aceita repetição |
| `etiquetaId` | string | Aceita repetição |
| `contaCompartilhadaId` | string | Escopo de grupo. Ausente ⇒ escopo pessoal |
| `incluirExcluidas` | bool | Padrão `false`. Requer permissão |

Repetir o parâmetro (em vez de usar `a,b`) evita ambiguidade com valores que contenham vírgula e é o comportamento nativo do Express e do `URLSearchParams`.

---

## 5. Autenticação

| Token | Duração | Transporte |
| ----- | ------- | ---------- |
| *Access token* (JWT) | 15 min | `Authorization: Bearer <token>` |
| *Refresh token* (opaco) | 7 dias | Cookie `refreshToken` — `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1/autenticacao` |

**Fluxo esperado do cliente:**

1. `POST /autenticacao/entrar` → guarda o access token **em memória** (nunca `localStorage`).
2. Requisição responde `401` com `codigo: "TOKEN_EXPIRADO"` → chama `POST /autenticacao/renovar` (o cookie viaja sozinho) → repete a requisição original.
3. Renovação falha → limpa a sessão e redireciona ao login.

Requisições concorrentes que recebam `401` devem aguardar **uma** renovação em fila. Renovações paralelas rotacionam o refresh token múltiplas vezes e derrubam a sessão (ver [02-ARCHITECTURE.md §6.4](02-ARCHITECTURE.md#64-camada-de-acesso-http)).

---

## 6. Índice de endpoints

Legenda: 🔓 público · 🔒 autenticado · 👑 administrador do grupo

### Autenticação
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| POST | `/autenticacao/cadastrar` | 🔓 |
| POST | `/autenticacao/entrar` | 🔓 |
| POST | `/autenticacao/renovar` | 🔓 (cookie) |
| POST | `/autenticacao/sair` | 🔒 |
| POST | `/autenticacao/sair-todos` | 🔒 |
| POST | `/autenticacao/verificar-email` | 🔓 |
| POST | `/autenticacao/reenviar-verificacao` | 🔓 |
| POST | `/autenticacao/esqueci-senha` | 🔓 |
| POST | `/autenticacao/redefinir-senha` | 🔓 |
| PATCH | `/autenticacao/alterar-senha` | 🔒 |
| GET | `/autenticacao/sessoes` | 🔒 |
| DELETE | `/autenticacao/sessoes/:id` | 🔒 |

### Perfil
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| GET | `/perfil` | 🔒 |
| PATCH | `/perfil` | 🔒 |
| POST | `/perfil/foto` | 🔒 |
| DELETE | `/perfil/foto` | 🔒 |
| DELETE | `/perfil/conta` | 🔒 |
| GET | `/perfil/exportar-dados` | 🔒 |

### Contas
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| GET | `/contas` | 🔒 |
| GET | `/contas/resumo` | 🔒 |
| GET | `/contas/:id` | 🔒 |
| GET | `/contas/:id/extrato` | 🔒 |
| POST | `/contas` | 🔒 |
| PATCH | `/contas/:id` | 🔒 |
| PATCH | `/contas/:id/arquivar` | 🔒 |
| PATCH | `/contas/:id/desarquivar` | 🔒 |
| PATCH | `/contas/reordenar` | 🔒 |
| DELETE | `/contas/:id` | 🔒 |

### Categorias
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| GET | `/categorias` | 🔒 |
| GET | `/categorias/:id` | 🔒 |
| POST | `/categorias` | 🔒 |
| PATCH | `/categorias/:id` | 🔒 |
| DELETE | `/categorias/:id` | 🔒 |

### Etiquetas
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| GET | `/etiquetas` | 🔒 |
| POST | `/etiquetas` | 🔒 |
| PATCH | `/etiquetas/:id` | 🔒 |
| DELETE | `/etiquetas/:id` | 🔒 |

### Movimentações
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| GET | `/movimentacoes` | 🔒 |
| GET | `/movimentacoes/:id` | 🔒 |
| POST | `/movimentacoes` | 🔒 |
| PATCH | `/movimentacoes/:id` | 🔒 |
| DELETE | `/movimentacoes/:id` | 🔒 |
| POST | `/movimentacoes/:id/duplicar` | 🔒 |
| PATCH | `/movimentacoes/:id/pagar` | 🔒 |
| PATCH | `/movimentacoes/:id/estornar` | 🔒 |
| POST | `/movimentacoes/parceladas` | 🔒 |
| GET | `/movimentacoes/:id/ocorrencias` | 🔒 |

### Transferências
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| POST | `/transferencias` | 🔒 |
| GET | `/transferencias/:transferenciaId` | 🔒 |
| DELETE | `/transferencias/:transferenciaId` | 🔒 |

### Anexos
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| POST | `/movimentacoes/:id/anexos` | 🔒 |
| GET | `/anexos/:id/conteudo` | 🔒 |
| DELETE | `/anexos/:id` | 🔒 |

### Cartões e faturas
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| GET | `/cartoes` | 🔒 |
| GET | `/cartoes/:id` | 🔒 |
| POST | `/cartoes` | 🔒 |
| PATCH | `/cartoes/:id` | 🔒 |
| DELETE | `/cartoes/:id` | 🔒 |
| GET | `/cartoes/:id/faturas` | 🔒 |
| GET | `/faturas/:id` | 🔒 |
| PATCH | `/faturas/:id/pagar` | 🔒 |

### Contas compartilhadas
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| GET | `/contas-compartilhadas` | 🔒 |
| GET | `/contas-compartilhadas/:id` | 🔒 |
| POST | `/contas-compartilhadas` | 🔒 |
| PATCH | `/contas-compartilhadas/:id` | 👑 |
| DELETE | `/contas-compartilhadas/:id` | 👑 |
| POST | `/contas-compartilhadas/:id/imagem` | 👑 |
| GET | `/contas-compartilhadas/:id/membros` | 🔒 |
| PATCH | `/contas-compartilhadas/:id/membros/:membroId` | 👑 |
| DELETE | `/contas-compartilhadas/:id/membros/:membroId` | 👑 |
| POST | `/contas-compartilhadas/:id/transferir-administracao` | 👑 |
| POST | `/contas-compartilhadas/:id/sair` | 🔒 |
| GET | `/contas-compartilhadas/:id/auditoria` | 👑 |

### Convites
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| POST | `/contas-compartilhadas/:id/convites` | 👑 |
| GET | `/contas-compartilhadas/:id/convites` | 👑 |
| DELETE | `/convites/:id` | 👑 |
| GET | `/convites/recebidos` | 🔒 |
| GET | `/convites/token/:token` | 🔓 |
| POST | `/convites/:id/aceitar` | 🔒 |
| POST | `/convites/:id/recusar` | 🔒 |

### Metas
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| GET | `/metas` | 🔒 |
| GET | `/metas/:id` | 🔒 |
| POST | `/metas` | 🔒 |
| PATCH | `/metas/:id` | 🔒 |
| DELETE | `/metas/:id` | 🔒 |
| POST | `/metas/:id/aportes` | 🔒 |
| DELETE | `/metas/:id/aportes/:aporteId` | 🔒 |

### Orçamentos
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| GET | `/orcamentos` | 🔒 |
| GET | `/orcamentos/:id` | 🔒 |
| POST | `/orcamentos` | 🔒 |
| PATCH | `/orcamentos/:id` | 🔒 |
| DELETE | `/orcamentos/:id` | 🔒 |
| POST | `/orcamentos/replicar` | 🔒 |

### Notificações
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| GET | `/notificacoes` | 🔒 |
| GET | `/notificacoes/nao-lidas/contagem` | 🔒 |
| PATCH | `/notificacoes/:id/ler` | 🔒 |
| PATCH | `/notificacoes/ler-todas` | 🔒 |
| DELETE | `/notificacoes/:id` | 🔒 |

### Dashboard, relatórios, pesquisa e saúde
| Método | Rota | Acesso |
| ------ | ---- | ------ |
| GET | `/dashboard` | 🔒 |
| GET | `/dashboard/indicadores` | 🔒 |
| GET | `/dashboard/fluxo-caixa` | 🔒 |
| GET | `/dashboard/por-categoria` | 🔒 |
| GET | `/relatorios/mensal` | 🔒 |
| GET | `/relatorios/anual` | 🔒 |
| GET | `/relatorios/por-categoria` | 🔒 |
| GET | `/relatorios/por-conta` | 🔒 |
| GET | `/relatorios/fluxo-caixa` | 🔒 |
| GET | `/relatorios/comparativo` | 🔒 |
| POST | `/relatorios/exportar` | 🔒 |
| GET | `/pesquisa` | 🔒 |
| GET | `/saude` | 🔓 |
| GET | `/saude/prontidao` | 🔓 |

---

## 7. Autenticação e sessão

### 7.1 `POST /autenticacao/cadastrar`

Cria usuário, perfil com padrões e cópia das categorias padrão (RF-19). Envia e-mail de verificação.

**Corpo**

```json
{
  "nome": "Samuel De Marco",
  "email": "samuel@exemplo.com",
  "senha": "SenhaForte@2026",
  "confirmacaoSenha": "SenhaForte@2026"
}
```

| Campo | Tipo | Regras |
| ----- | ---- | ------ |
| `nome` | string | 3–120 caracteres |
| `email` | string | E-mail válido, normalizado para minúsculas, único |
| `senha` | string | 8–72 caracteres, ao menos 1 maiúscula, 1 minúscula, 1 dígito e 1 símbolo |
| `confirmacaoSenha` | string | Igual a `senha` |

**`201 Created`**

```json
{
  "success": true,
  "message": "Cadastro realizado. Verifique seu e-mail para ativar a conta.",
  "data": {
    "usuario": {
      "id": "clx8a9b0c0001",
      "nome": "Samuel De Marco",
      "email": "samuel@exemplo.com",
      "emailVerificado": false,
      "criadoEm": "2026-07-29T14:03:11.482Z"
    }
  }
}
```

**`409 EMAIL_JA_CADASTRADO`**

```json
{ "success": false, "message": "Este e-mail já está cadastrado.", "codigo": "EMAIL_JA_CADASTRADO" }
```

O limite de 72 caracteres na senha não é arbitrário: é o tamanho máximo que o bcrypt considera. Senhas maiores seriam silenciosamente truncadas.

---

### 7.2 `POST /autenticacao/entrar`

**Corpo**

```json
{ "email": "samuel@exemplo.com", "senha": "SenhaForte@2026", "lembrarMe": true }
```

`lembrarMe: true` estende o refresh token para 30 dias.

**`200 OK`**

```json
{
  "success": true,
  "message": "Autenticado com sucesso.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiraEm": 900,
    "usuario": {
      "id": "clx8a9b0c0001",
      "nome": "Samuel De Marco",
      "email": "samuel@exemplo.com",
      "perfil": {
        "fotoUrl": "https://.../avatares/clx8a9b0c0001.webp",
        "moedaPadrao": "BRL",
        "idioma": "pt-BR",
        "tema": "SISTEMA",
        "timezone": "America/Sao_Paulo"
      }
    }
  }
}
```

```
Set-Cookie: refreshToken=<opaco>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/autenticacao; Max-Age=604800
```

**Erros** — `401 CREDENCIAIS_INVALIDAS` (mesma mensagem para e-mail inexistente e senha errada, para não permitir enumeração de contas) · `403 EMAIL_NAO_VERIFICADO` · `403 CONTA_BLOQUEADA` (com `meta.desbloqueiaEm`) · `429 LIMITE_EXCEDIDO`.

---

### 7.3 `POST /autenticacao/renovar`

Sem corpo. Consome o cookie `refreshToken`, revoga-o e emite um novo par (RN-53).

**`200 OK`**

```json
{ "success": true, "message": "Sessão renovada.", "data": { "accessToken": "eyJ...", "expiraEm": 900 } }
```

**`401 NAO_AUTENTICADO`** — token ausente, expirado, revogado ou não reconhecido. O cliente deve encerrar a sessão localmente.

> Reuso de refresh token já revogado é tratado como indício de vazamento: **toda** a família de tokens do usuário é revogada e a resposta é `401`.

---

### 7.4 `POST /autenticacao/sair` · `POST /autenticacao/sair-todos`

`sair` revoga o refresh token da sessão atual; `sair-todos` revoga todos (RF-06). Ambos limpam o cookie e respondem `204 No Content`.

---

### 7.5 `POST /autenticacao/verificar-email`

```json
{ "token": "a3f9c1e8b7d6..." }
```

`200` — `{ "success": true, "message": "E-mail verificado com sucesso." }`
`400 VALIDACAO` — token inválido ou expirado (validade 24 h).

---

### 7.6 `POST /autenticacao/esqueci-senha`

```json
{ "email": "samuel@exemplo.com" }
```

Responde **sempre** `200` com a mesma mensagem, exista ou não o e-mail — não revela quais e-mails estão cadastrados.

```json
{ "success": true, "message": "Se o e-mail estiver cadastrado, você receberá as instruções em instantes." }
```

---

### 7.7 `POST /autenticacao/redefinir-senha`

```json
{ "token": "b7e2...", "senha": "NovaSenha@2026", "confirmacaoSenha": "NovaSenha@2026" }
```

`200` — senha alterada; **todos** os refresh tokens são revogados. `400 VALIDACAO` — token inválido ou expirado (1 h).

---

### 7.8 `PATCH /autenticacao/alterar-senha` 🔒

```json
{ "senhaAtual": "SenhaForte@2026", "senhaNova": "OutraSenha@2026", "confirmacaoSenha": "OutraSenha@2026" }
```

`200` — alterada; demais sessões revogadas, a atual é mantida. `400 VALIDACAO` — senha atual incorreta.

---

### 7.9 `GET /autenticacao/sessoes` 🔒

```json
{
  "success": true,
  "message": "Sessões ativas listadas.",
  "data": {
    "sessoes": [
      { "id": "clx...", "dispositivo": "Chrome · Windows", "ip": "189.x.x.x", "criadoEm": "2026-07-28T09:11:00.000Z", "expiraEm": "2026-08-04T09:11:00.000Z", "atual": true }
    ]
  }
}
```

`DELETE /autenticacao/sessoes/:id` revoga uma sessão específica → `204`.

---

## 8. Perfil

### 8.1 `GET /perfil` 🔒

```json
{
  "success": true,
  "message": "Perfil carregado.",
  "data": {
    "perfil": {
      "id": "clx...",
      "nome": "Samuel De Marco",
      "email": "samuel@exemplo.com",
      "emailVerificado": true,
      "fotoUrl": "https://.../avatares/clx8a9b0c0001.webp",
      "moedaPadrao": "BRL",
      "idioma": "pt-BR",
      "tema": "ESCURO",
      "timezone": "America/Sao_Paulo",
      "formatoData": "dd/MM/yyyy",
      "primeiroDiaSemana": 0,
      "notificacoesApp": true,
      "notificacoesEmail": true,
      "criadoEm": "2026-06-01T10:00:00.000Z"
    }
  }
}
```

### 8.2 `PATCH /perfil` 🔒

Todos os campos são opcionais.

```json
{ "nome": "Samuel M.", "tema": "ESCURO", "timezone": "America/Sao_Paulo", "moedaPadrao": "BRL", "idioma": "pt-BR", "notificacoesEmail": false }
```

`email` **não** é alterável por esta rota — trocar e-mail exige novo fluxo de verificação, previsto para v1.2.

### 8.3 `POST /perfil/foto` 🔒

`multipart/form-data`, campo `foto`. JPEG/PNG/WebP, máx. 2 MB. Converte para WebP e gera *thumbnail* 128×128.

```json
{ "success": true, "message": "Foto atualizada.", "data": { "fotoUrl": "https://.../avatares/clx8a9b0c0001.webp" } }
```

`413 ARQUIVO_MUITO_GRANDE` · `415 TIPO_ARQUIVO_INVALIDO`.

### 8.4 `DELETE /perfil/conta` 🔒

```json
{ "senha": "SenhaForte@2026", "confirmacao": "EXCLUIR MINHA CONTA" }
```

Anonimiza dados pessoais, revoga sessões e preserva registros financeiros de grupos (RN-34, RF-09). `204`.
`422 ADMINISTRADOR_UNICO` se o usuário for administrador único de algum grupo.

### 8.5 `GET /perfil/exportar-dados` 🔒

Exportação completa (LGPD). Responde `202 Accepted` e envia por e-mail um link temporário para o arquivo JSON.

---

## 9. Contas financeiras

### 9.1 `GET /contas` 🔒

**Query:** `contaCompartilhadaId`, `tipo` (repetível), `incluirArquivadas` (bool, padrão `false`), `ordenarPor` (`ordem`|`nome`|`saldoAtual`, padrão `ordem`), `ordem`.

Não paginado — o número de contas por usuário é naturalmente pequeno.

```json
{
  "success": true,
  "message": "Contas listadas com sucesso.",
  "data": {
    "contas": [
      {
        "id": "clx_conta_1",
        "nome": "Banco Principal",
        "tipo": "CONTA_CORRENTE",
        "instituicao": "Nubank",
        "saldoInicial": "3500.00",
        "saldoAtual": "4182.35",
        "saldoPrevisto": "3982.35",
        "moeda": "BRL",
        "cor": "#8B5CF6",
        "icone": "landmark",
        "incluirNoSaldoTotal": true,
        "ordem": 0,
        "arquivada": false,
        "quantidadeMovimentacoes": 87,
        "escopo": { "tipo": "PESSOAL", "id": "clx8a9b0c0001", "nome": "Samuel De Marco" },
        "criadoEm": "2026-06-01T10:05:00.000Z"
      }
    ]
  },
  "meta": { "totalizadores": { "saldoTotal": "4332.35", "quantidadeContas": 3 } }
}
```

`saldoTotal` considera apenas contas com `incluirNoSaldoTotal: true` e não arquivadas (RN-05).

### 9.2 `GET /contas/resumo` 🔒

Versão enxuta para preencher seletores, sem agregações de saldo.

```json
{ "success": true, "message": "Resumo carregado.", "data": { "contas": [ { "id": "clx_conta_1", "nome": "Banco Principal", "tipo": "CONTA_CORRENTE", "cor": "#8B5CF6", "icone": "landmark" } ] } }
```

### 9.3 `POST /contas` 🔒

```json
{
  "nome": "Banco Principal",
  "tipo": "CONTA_CORRENTE",
  "instituicao": "Nubank",
  "saldoInicial": "3500.00",
  "cor": "#8B5CF6",
  "icone": "landmark",
  "incluirNoSaldoTotal": true,
  "contaCompartilhadaId": null
}
```

| Campo | Tipo | Regras |
| ----- | ---- | ------ |
| `nome` | string | 2–120, único no escopo (case-insensitive) |
| `tipo` | enum | `TipoConta` |
| `saldoInicial` | string decimal | Pode ser negativo (conta em cheque especial). Padrão `"0.00"` |
| `cor` | string | Hex `#RRGGBB` |
| `icone` | string | Nome do ícone Lucide |
| `contaCompartilhadaId` | string? | Se informado, cria conta de grupo — requer papel `ADMINISTRADOR` |

`201` com `Location: /api/v1/contas/clx_conta_1`. Erros: `409 CONFLITO` (nome duplicado) · `403 PAPEL_INSUFICIENTE`.

### 9.4 `GET /contas/:id/extrato` 🔒

**Query:** `dataInicio`, `dataFim`, `pagina`, `limite`.

```json
{
  "success": true,
  "message": "Extrato gerado.",
  "data": {
    "conta": { "id": "clx_conta_1", "nome": "Banco Principal" },
    "saldoInicialPeriodo": "3900.00",
    "saldoFinalPeriodo": "4182.35",
    "movimentacoes": [
      { "id": "clx_mov_9", "data": "2026-07-05", "descricao": "Salário", "tipo": "RECEITA", "valor": "5400.00", "saldoAcumulado": "9300.00", "categoria": { "id": "clx_cat_1", "nome": "Salário", "cor": "#16A34A" } }
    ]
  },
  "meta": { "paginacao": { "pagina": 1, "limite": 20, "total": 34, "totalPaginas": 2, "temProxima": true, "temAnterior": false } }
}
```

`saldoAcumulado` é o saldo após aquele lançamento, calculado no servidor — o cliente não deve recomputá-lo, pois só conhece a página atual.

### 9.5 `PATCH /contas/:id/arquivar` · `/desarquivar` 🔒

Sem corpo. `200` com a conta atualizada.

### 9.6 `PATCH /contas/reordenar` 🔒

```json
{ "ordens": [ { "id": "clx_conta_2", "ordem": 0 }, { "id": "clx_conta_1", "ordem": 1 } ] }
```

### 9.7 `DELETE /contas/:id` 🔒

`204` se não houver movimentações. Caso contrário:

```json
{
  "success": false,
  "message": "Esta conta possui 87 movimentações e não pode ser excluída. Arquive-a para preservar o histórico.",
  "codigo": "RECURSO_EM_USO",
  "errors": [ { "campo": "id", "mensagem": "Existem 87 movimentações vinculadas." } ]
}
```

`409`. A mensagem indica a alternativa (arquivar) — erro que não aponta o caminho apenas frustra o usuário (RF-17).

---

## 10. Categorias

### 10.1 `GET /categorias` 🔒

**Query:** `tipo` (`RECEITA`|`DESPESA`|`AMBOS`), `contaCompartilhadaId`, `apenasRaiz` (bool), `incluirSubcategorias` (bool, padrão `true`).

```json
{
  "success": true,
  "message": "Categorias listadas com sucesso.",
  "data": {
    "categorias": [
      {
        "id": "clx_cat_10",
        "nome": "Alimentação",
        "tipo": "DESPESA",
        "cor": "#EA580C",
        "icone": "utensils",
        "categoriaPaiId": null,
        "ehPadraoSistema": false,
        "ordem": 5,
        "quantidadeMovimentacoes": 42,
        "subcategorias": [
          { "id": "clx_cat_11", "nome": "Restaurante", "tipo": "DESPESA", "cor": "#EA580C", "icone": "utensils", "categoriaPaiId": "clx_cat_10", "quantidadeMovimentacoes": 18 }
        ]
      }
    ]
  }
}
```

### 10.2 `POST /categorias` 🔒

```json
{ "nome": "Academia", "tipo": "DESPESA", "cor": "#84CC16", "icone": "dumbbell", "categoriaPaiId": null, "contaCompartilhadaId": null }
```

**Regras:** `categoriaPaiId` deve ser categoria raiz do mesmo escopo e mesmo tipo — profundidade máxima 1 (RF-21). Subcategoria de subcategoria responde `422 REGRA_NEGOCIO`.

### 10.3 `PATCH /categorias/:id` 🔒

`tipo` só pode mudar se não houver movimentações vinculadas — mudança retroativa reclassificaria lançamentos existentes (RN-10). Caso contrário, `422 REGRA_NEGOCIO`.

### 10.4 `DELETE /categorias/:id` 🔒

**Query:** `recategorizarPara=<categoriaId>` (obrigatório se houver movimentações vinculadas).

Sem o parâmetro e com vínculos → `409 RECURSO_EM_USO` com `meta.quantidadeMovimentacoes`. Com o parâmetro, migra e exclui em uma transação → `204` (RF-22).

---

## 11. Etiquetas

### 11.1 `GET /etiquetas` 🔒

```json
{ "success": true, "message": "Etiquetas listadas.", "data": { "etiquetas": [ { "id": "clx_etq_1", "nome": "viagem-chile", "cor": "#0EA5E9", "quantidadeMovimentacoes": 12 } ] } }
```

### 11.2 `POST /etiquetas` 🔒

```json
{ "nome": "viagem-chile", "cor": "#0EA5E9", "contaCompartilhadaId": null }
```

Nome de 1–40 caracteres, normalizado para minúsculas e único no escopo. `409 CONFLITO` em duplicidade.

### 11.3 `DELETE /etiquetas/:id` 🔒

Remove a etiqueta e todos os vínculos. Não afeta movimentações. `204`.

---

## 12. Movimentações

Recurso central da API. Estas regras valem para todos os endpoints desta seção.

### 12.1 `GET /movimentacoes` 🔒

**Query**

| Parâmetro | Tipo | Descrição |
| --------- | ---- | --------- |
| `dataInicio` / `dataFim` | date | Intervalo de `dataCompetencia` |
| `campoData` | enum | `COMPETENCIA` (padrão) \| `VENCIMENTO` \| `EFETIVACAO` |
| `tipo` | enum⁺ | `RECEITA`, `DESPESA`, `TRANSFERENCIA` |
| `situacao` | enum⁺ | `SituacaoMovimentacao` |
| `contaId` | string⁺ | |
| `categoriaId` | string⁺ | Inclui subcategorias automaticamente |
| `etiquetaId` | string⁺ | |
| `cartaoId` | string⁺ | |
| `contaCompartilhadaId` | string | Ausente ⇒ escopo pessoal |
| `valorMinimo` / `valorMaximo` | string decimal | |
| `busca` | string | Descrição e observação, ≥ 2 caracteres |
| `apenasRecorrentes` | bool | |
| `apenasParceladas` | bool | |
| `pagina` / `limite` | int | |
| `ordenarPor` | enum | `dataCompetencia` (padrão) \| `dataVencimento` \| `valor` \| `descricao` \| `criadoEm` |
| `ordem` | enum | `desc` (padrão) \| `asc` |

⁺ = repetível (OU lógico).

**`200 OK`**

```json
{
  "success": true,
  "message": "Movimentações listadas com sucesso.",
  "data": {
    "movimentacoes": [
      {
        "id": "clx_mov_100",
        "tipo": "DESPESA",
        "descricao": "Mercado do mês",
        "observacao": "Compra grande, estoque para 30 dias",
        "valor": "487.90",
        "valorPago": "487.90",
        "situacao": "PAGA",
        "dataCompetencia": "2026-07-15",
        "dataVencimento": "2026-07-15",
        "dataEfetivacao": "2026-07-15",
        "conta": { "id": "clx_conta_1", "nome": "Banco Principal", "cor": "#8B5CF6", "icone": "landmark" },
        "contaCompartilhada": null,
        "categoria": { "id": "clx_cat_20", "nome": "Mercado", "cor": "#F97316", "icone": "shopping-cart", "categoriaPaiId": null },
        "cartao": null,
        "fatura": null,
        "etiquetas": [ { "id": "clx_etq_2", "nome": "essencial", "cor": "#64748B" } ],
        "autor": { "id": "clx8a9b0c0001", "nome": "Samuel De Marco", "fotoUrl": null },
        "transferencia": null,
        "recorrencia": null,
        "parcelamento": null,
        "quantidadeAnexos": 1,
        "criadoEm": "2026-07-15T18:22:03.001Z",
        "atualizadoEm": "2026-07-15T18:22:03.001Z"
      },
      {
        "id": "clx_mov_101",
        "tipo": "DESPESA",
        "descricao": "Notebook Dell",
        "valor": "580.00",
        "valorPago": "0.00",
        "situacao": "PENDENTE",
        "dataCompetencia": "2026-08-10",
        "dataVencimento": "2026-08-10",
        "dataEfetivacao": null,
        "conta": null,
        "cartao": { "id": "clx_cartao_1", "nome": "Nubank", "bandeira": "VISA" },
        "fatura": { "id": "clx_fat_8", "ano": 2026, "mes": 8, "situacao": "ABERTA" },
        "parcelamento": { "compraParceladaId": "clx_compra_3", "numeroParcela": 3, "totalParcelas": 10, "valorTotal": "5800.00", "rotulo": "3/10" },
        "recorrencia": null,
        "transferencia": null
      },
      {
        "id": "clx_mov_102",
        "tipo": "RECEITA",
        "descricao": "Salário",
        "valor": "5400.00",
        "valorPago": "5400.00",
        "situacao": "PAGA",
        "dataCompetencia": "2026-07-05",
        "recorrencia": { "modeloId": "clx_mov_050", "frequencia": "MENSAL", "intervalo": 1, "fimEm": null, "ocorrenciaAtual": 7 }
      },
      {
        "id": "clx_mov_103",
        "tipo": "TRANSFERENCIA",
        "descricao": "Banco → Carteira",
        "valor": "200.00",
        "valorPago": "200.00",
        "situacao": "PAGA",
        "dataCompetencia": "2026-07-20",
        "conta": { "id": "clx_conta_1", "nome": "Banco Principal" },
        "categoria": null,
        "transferencia": {
          "transferenciaId": "5f2b8c1a-...",
          "sentido": "SAIDA",
          "contraparte": { "movimentacaoId": "clx_mov_104", "conta": { "id": "clx_conta_2", "nome": "Carteira" } }
        }
      }
    ]
  },
  "meta": {
    "paginacao": { "pagina": 1, "limite": 20, "total": 137, "totalPaginas": 7, "temProxima": true, "temAnterior": false },
    "totalizadores": {
      "receitas": "5400.00",
      "despesas": "3218.45",
      "resultado": "2181.55",
      "receitasPendentes": "0.00",
      "despesasPendentes": "1140.00"
    }
  }
}
```

**Notas sobre a resposta:**

- Os objetos `transferencia`, `recorrencia` e `parcelamento` são `null` quando não se aplicam. Sempre presentes como chave — o cliente não precisa de checagem de existência de propriedade.
- `totalizadores` **exclui** transferências (RN-25) e canceladas, e refere-se ao **filtro inteiro**, não à página.
- `categoria` é `null` em transferências: transferência não é receita nem despesa e não se classifica.
- Registros com `ehModeloRecorrencia = true` **nunca** aparecem nesta listagem. Consulte-os por `/movimentacoes/:id/ocorrencias`.

### 12.2 `POST /movimentacoes` 🔒

**Receita ou despesa simples**

```json
{
  "tipo": "DESPESA",
  "descricao": "Mercado do mês",
  "observacao": "Compra grande",
  "valor": "487.90",
  "dataCompetencia": "2026-07-15",
  "dataVencimento": "2026-07-15",
  "situacao": "PAGA",
  "dataEfetivacao": "2026-07-15",
  "contaId": "clx_conta_1",
  "categoriaId": "clx_cat_20",
  "etiquetaIds": ["clx_etq_2"]
}
```

**Com recorrência**

```json
{
  "tipo": "RECEITA",
  "descricao": "Salário",
  "valor": "5400.00",
  "dataCompetencia": "2026-08-05",
  "contaId": "clx_conta_1",
  "categoriaId": "clx_cat_1",
  "situacao": "PENDENTE",
  "recorrencia": { "frequencia": "MENSAL", "intervalo": 1, "fimEm": null, "totalOcorrencias": null }
}
```

**Em conta compartilhada**

```json
{
  "tipo": "DESPESA",
  "descricao": "Conta de luz",
  "valor": "218.40",
  "dataCompetencia": "2026-07-10",
  "dataVencimento": "2026-07-20",
  "situacao": "PENDENTE",
  "contaCompartilhadaId": "clx_grupo_1",
  "categoriaId": "clx_cat_grupo_5"
}
```

**Despesa no cartão**

```json
{
  "tipo": "DESPESA",
  "descricao": "Assinatura streaming",
  "valor": "39.90",
  "dataCompetencia": "2026-07-22",
  "cartaoId": "clx_cartao_1",
  "categoriaId": "clx_cat_25",
  "situacao": "PENDENTE"
}
```

**Campos**

| Campo | Tipo | Obrig. | Regras |
| ----- | ---- | :----: | ------ |
| `tipo` | enum | ✅ | `RECEITA` \| `DESPESA`. `TRANSFERENCIA` **não** é aceita aqui — use `/transferencias` |
| `descricao` | string | ✅ | 2–200 |
| `observacao` | string | — | ≤ 1000 |
| `valor` | string decimal | ✅ | `> 0`, máx. 2 casas (RN-08) |
| `dataCompetencia` | date | ✅ | Entre hoje−20 anos e hoje+10 anos (RN-13) |
| `dataVencimento` | date | — | Padrão: `dataCompetencia` |
| `situacao` | enum | — | Padrão `PENDENTE` |
| `dataEfetivacao` | date | condicional | Obrigatória se `situacao ∈ {PAGA, PAGA_PARCIALMENTE}` |
| `valorPago` | string decimal | condicional | Obrigatório se `situacao = PAGA_PARCIALMENTE`; `0 < valorPago < valor` |
| `contaId` | string | condicional | XOR com `contaCompartilhadaId` e `cartaoId` (RN-09) |
| `contaCompartilhadaId` | string | condicional | Requer papel ≥ `PARTICIPANTE` |
| `cartaoId` | string | condicional | Somente com `tipo = DESPESA`. A fatura é resolvida pelo servidor (RN-40) |
| `categoriaId` | string | ✅ | Tipo compatível e mesmo escopo (RN-10, RN-11) |
| `etiquetaIds` | string[] | — | Máx. 10, todas do mesmo escopo |
| `recorrencia` | objeto | — | Ver abaixo |

**Objeto `recorrencia`**

| Campo | Tipo | Regras |
| ----- | ---- | ------ |
| `frequencia` | enum | `FrequenciaRecorrencia` |
| `intervalo` | int | 1–12, padrão `1` |
| `fimEm` | date? | Exclusivo com `totalOcorrencias` |
| `totalOcorrencias` | int? | 2–360, exclusivo com `fimEm` |

Informar `fimEm` **e** `totalOcorrencias` responde `422 REGRA_NEGOCIO` — as duas formas de limitar são mutuamente exclusivas para evitar ambiguidade sobre qual prevalece.

**`201 Created`** — retorna a movimentação criada. Com recorrência, `meta` informa a geração:

```json
{
  "success": true,
  "message": "Movimentação recorrente criada. 12 ocorrências geradas.",
  "data": { "movimentacao": { } },
  "meta": { "recorrencia": { "modeloId": "clx_mov_050", "ocorrenciasGeradas": 12, "proximaGeracaoEm": "2027-07-05" } }
}
```

**Erros** — `404 NAO_ENCONTRADO` (conta/categoria) · `422 CATEGORIA_INCOMPATIVEL` · `422 CONTA_ARQUIVADA` · `403 PAPEL_INSUFICIENTE` · `400 VALIDACAO`.

Exemplo de `422 CATEGORIA_INCOMPATIVEL`:

```json
{
  "success": false,
  "message": "A categoria selecionada não é compatível com o tipo da movimentação.",
  "codigo": "CATEGORIA_INCOMPATIVEL",
  "errors": [ { "campo": "categoriaId", "mensagem": "A categoria \"Salário\" aceita apenas movimentações de RECEITA." } ]
}
```

### 12.3 `PATCH /movimentacoes/:id` 🔒

Envie apenas os campos alterados. Para movimentação que pertence a uma recorrência, `escopoEdicao` é **obrigatório** (RN-19):

```json
{ "valor": "520.00", "escopoEdicao": "ESTA_E_FUTURAS" }
```

| `escopoEdicao` | Efeito |
| -------------- | ------ |
| `APENAS_ESTA` | Altera só esta ocorrência, que passa a divergir do modelo |
| `ESTA_E_FUTURAS` | Altera esta e as ocorrências futuras não efetivadas; atualiza o modelo |
| `TODAS` | Altera todas as ocorrências não efetivadas e o modelo |

Omitir `escopoEdicao` em ocorrência de recorrência responde `400 VALIDACAO`. Enviá-lo em movimentação avulsa é ignorado.

Alterar `contaId`, `contaCompartilhadaId` ou `cartaoId` **não** é permitido — mudar de conta é excluir e recriar, já que os saldos das duas contas seriam afetados (`422 REGRA_NEGOCIO`).

### 12.4 `PATCH /movimentacoes/:id/pagar` 🔒

```json
{ "dataEfetivacao": "2026-07-21", "valorPago": "218.40", "contaId": "clx_conta_1" }
```

Todos opcionais: `dataEfetivacao` padrão hoje; `valorPago` padrão o valor total; `contaId` só é necessário para pagar despesa de cartão ou movimentação sem conta definida.

Pagamento parcial (`valorPago < valor`) resulta em `PAGA_PARCIALMENTE` (RN-03); pagamento total, em `PAGA` (RN-14).

`422 REGRA_NEGOCIO` se já estiver `PAGA` ou `CANCELADA`.

### 12.5 `PATCH /movimentacoes/:id/estornar` 🔒

Reverte para `PENDENTE`, zera `valorPago` e `dataEfetivacao`. `200`.

### 12.6 `POST /movimentacoes/:id/duplicar` 🔒

```json
{ "dataCompetencia": "2026-08-15", "situacao": "PENDENTE" }
```

Copia todos os campos, **exceto** anexos, vínculos de recorrência e de parcelamento. `201` (RF-26).

### 12.7 `POST /movimentacoes/parceladas` 🔒

```json
{
  "descricao": "Notebook Dell",
  "valorTotal": "5800.00",
  "totalParcelas": 10,
  "dataPrimeiraParcela": "2026-06-10",
  "cartaoId": "clx_cartao_1",
  "categoriaId": "clx_cat_30",
  "observacao": "Trabalho"
}
```

Alternativamente `contaId` em vez de `cartaoId`, para parcelamento sem cartão (carnê, boleto).

**`201 Created`**

```json
{
  "success": true,
  "message": "Compra parcelada criada. 10 parcelas geradas.",
  "data": {
    "compraParcelada": {
      "id": "clx_compra_3",
      "descricao": "Notebook Dell",
      "valorTotal": "5800.00",
      "totalParcelas": 10,
      "dataCompra": "2026-06-10",
      "parcelas": [
        { "id": "clx_mov_200", "numeroParcela": 1,  "valor": "580.00", "dataCompetencia": "2026-06-10", "situacao": "PAGA",     "faturaId": "clx_fat_6" },
        { "id": "clx_mov_209", "numeroParcela": 10, "valor": "580.00", "dataCompetencia": "2027-03-10", "situacao": "PENDENTE", "faturaId": null }
      ]
    }
  }
}
```

**Arredondamento (RN-21).** `valorTotal / totalParcelas` arredondado a 2 casas; a diferença acumulada vai para a **última** parcela. Para `"1000.00"` em 3 parcelas: `333.33`, `333.33`, `333.34` — soma exata de `1000.00`. O invariante `Σ parcelas = valorTotal` é verificado por teste unitário com casos de resto (`1000/3`, `100/7`, `0.05/2`).

### 12.8 `GET /movimentacoes/:id/ocorrencias` 🔒

Lista as ocorrências geradas por um modelo de recorrência. `:id` pode ser o modelo ou qualquer ocorrência dele.

```json
{
  "success": true,
  "message": "Ocorrências listadas.",
  "data": {
    "modelo": { "id": "clx_mov_050", "descricao": "Salário", "valor": "5400.00", "frequencia": "MENSAL", "intervalo": 1 },
    "ocorrencias": [
      { "id": "clx_mov_102", "dataCompetencia": "2026-07-05", "valor": "5400.00", "situacao": "PAGA", "divergeDoModelo": false },
      { "id": "clx_mov_110", "dataCompetencia": "2026-08-05", "valor": "5600.00", "situacao": "PENDENTE", "divergeDoModelo": true }
    ]
  }
}
```

### 12.9 `DELETE /movimentacoes/:id` 🔒

**Query:** `escopoExclusao=APENAS_ESTA|ESTA_E_FUTURAS|TODAS` (obrigatório para ocorrência de recorrência, RN-20).

Exclusão lógica (RN-16). `204`.

Excluir um lado de transferência remove **ambos** os lados (RN-39) — a operação em `/movimentacoes/:id` é aceita para conveniência, mas o efeito é o de `DELETE /transferencias/:transferenciaId`.

---

## 13. Transferências

### 13.1 `POST /transferencias` 🔒

```json
{
  "contaOrigemId": "clx_conta_1",
  "contaDestinoId": "clx_conta_2",
  "valor": "200.00",
  "data": "2026-07-20",
  "descricao": "Banco → Carteira",
  "observacao": null,
  "efetivada": true
}
```

| Campo | Tipo | Obrig. | Regras |
| ----- | ---- | :----: | ------ |
| `contaOrigemId` | string | ✅ | Conta própria ou de grupo do qual é membro (RN-27) |
| `contaDestinoId` | string | ✅ | Diferente da origem (RN-24) |
| `valor` | string decimal | ✅ | `> 0` |
| `data` | date | ✅ | |
| `descricao` | string | — | Padrão: `"<origem> → <destino>"` |
| `efetivada` | bool | — | Padrão `true`. `false` cria o par como `PENDENTE` |

**`201 Created`**

```json
{
  "success": true,
  "message": "Transferência realizada com sucesso.",
  "data": {
    "transferencia": {
      "transferenciaId": "5f2b8c1a-9d4e-4f8a-b1c2-3d4e5f6a7b8c",
      "valor": "200.00",
      "data": "2026-07-20",
      "descricao": "Banco → Carteira",
      "situacao": "PAGA",
      "saida":   { "movimentacaoId": "clx_mov_103", "conta": { "id": "clx_conta_1", "nome": "Banco Principal", "saldoAtual": "3982.35" } },
      "entrada": { "movimentacaoId": "clx_mov_104", "conta": { "id": "clx_conta_2", "nome": "Carteira",        "saldoAtual": "350.00" } }
    }
  }
}
```

Retornar os saldos atualizados das duas contas poupa duas requisições ao cliente e elimina a janela em que a interface exibiria saldo velho.

**Erros** — `422 CONTAS_IGUAIS` · `404 NAO_ENCONTRADO` · `422 CONTA_ARQUIVADA` · `403 PROIBIDO`.

### 13.2 `GET /transferencias/:transferenciaId` 🔒

Retorna o par completo, no mesmo formato de `data.transferencia` acima.

### 13.3 `DELETE /transferencias/:transferenciaId` 🔒

Exclui os dois lados na mesma transação (RN-26, RN-39). `204`.

---

## 14. Anexos

### 14.1 `POST /movimentacoes/:id/anexos` 🔒

`multipart/form-data`, campo `arquivo` (aceita múltiplos). PDF, JPEG, PNG. Máx. 5 MB por arquivo, 5 arquivos por movimentação.

```json
{
  "success": true,
  "message": "1 anexo enviado com sucesso.",
  "data": {
    "anexos": [
      { "id": "clx_anx_1", "nomeOriginal": "comprovante-mercado.pdf", "tipoMime": "application/pdf", "tamanhoBytes": 148523, "url": "/api/v1/anexos/clx_anx_1/conteudo", "criadoEm": "2026-07-15T18:25:00.000Z" }
    ]
  }
}
```

O tipo é validado por extensão **e** por *magic number*. Um `.pdf` cujo conteúdo não comece com `%PDF` é rejeitado com `415 TIPO_ARQUIVO_INVALIDO` — extensão é declaração do cliente, não evidência.

`413 ARQUIVO_MUITO_GRANDE` · `422 REGRA_NEGOCIO` (limite de 5 atingido).

### 14.2 `GET /anexos/:id/conteudo` 🔒

Faz *stream* do arquivo após validar a propriedade. Responde `Content-Type` real e `Content-Disposition: inline; filename="<nomeOriginal>"`. `404` se o anexo não pertencer ao escopo do usuário.

### 14.3 `DELETE /anexos/:id` 🔒

Remove registro e arquivo físico. `204`.

---

## 15. Cartões e faturas

### 15.1 `GET /cartoes` 🔒

```json
{
  "success": true,
  "message": "Cartões listados.",
  "data": {
    "cartoes": [
      {
        "id": "clx_cartao_1",
        "nome": "Nubank",
        "bandeira": "VISA",
        "ultimosDigitos": "4821",
        "limiteTotal": "5000.00",
        "limiteUtilizado": "1240.50",
        "limiteDisponivel": "3759.50",
        "percentualUtilizado": 24.81,
        "diaFechamento": 28,
        "diaVencimento": 8,
        "cor": "#7C3AED",
        "ativo": true,
        "contaPagamentoPadrao": { "id": "clx_conta_1", "nome": "Banco Principal" },
        "faturaAtual": {
          "id": "clx_fat_8", "ano": 2026, "mes": 8,
          "valorTotal": "640.50", "valorPago": "0.00",
          "situacao": "ABERTA",
          "dataFechamento": "2026-07-28", "dataVencimento": "2026-08-08",
          "diasParaFechamento": 3
        }
      }
    ]
  }
}
```

### 15.2 `POST /cartoes` 🔒

```json
{
  "nome": "Nubank",
  "bandeira": "VISA",
  "ultimosDigitos": "4821",
  "limiteTotal": "5000.00",
  "diaFechamento": 28,
  "diaVencimento": 8,
  "contaPagamentoPadraoId": "clx_conta_1",
  "cor": "#7C3AED"
}
```

`diaFechamento` e `diaVencimento` entre 1 e 31. Em meses mais curtos, aplica-se o último dia (RN-41). **Nunca** armazenamos o número completo do cartão — apenas os quatro últimos dígitos, e mesmo esses são opcionais.

### 15.3 `GET /cartoes/:id/faturas` 🔒

**Query:** `situacao` (repetível), `ano`, `pagina`, `limite`.

```json
{
  "success": true,
  "message": "Faturas listadas.",
  "data": {
    "faturas": [
      { "id": "clx_fat_8", "ano": 2026, "mes": 8, "dataFechamento": "2026-07-28", "dataVencimento": "2026-08-08", "valorTotal": "640.50", "valorPago": "0.00", "valorRestante": "640.50", "situacao": "ABERTA", "quantidadeMovimentacoes": 7 }
    ]
  },
  "meta": { "paginacao": { "pagina": 1, "limite": 20, "total": 14, "totalPaginas": 1, "temProxima": false, "temAnterior": false } }
}
```

### 15.4 `GET /faturas/:id` 🔒

Detalhe com os itens agrupados por categoria:

```json
{
  "success": true,
  "message": "Fatura carregada.",
  "data": {
    "fatura": {
      "id": "clx_fat_8", "ano": 2026, "mes": 8,
      "cartao": { "id": "clx_cartao_1", "nome": "Nubank", "bandeira": "VISA" },
      "dataFechamento": "2026-07-28", "dataVencimento": "2026-08-08",
      "valorTotal": "640.50", "valorPago": "0.00", "situacao": "ABERTA",
      "movimentacoes": [
        { "id": "clx_mov_101", "descricao": "Notebook Dell", "valor": "580.00", "dataCompetencia": "2026-07-10", "parcelamento": { "rotulo": "3/10" }, "categoria": { "id": "clx_cat_30", "nome": "Eletrônicos", "cor": "#3B82F6" } },
        { "id": "clx_mov_130", "descricao": "Assinatura streaming", "valor": "39.90", "dataCompetencia": "2026-07-22", "parcelamento": null, "categoria": { "id": "clx_cat_25", "nome": "Assinaturas", "cor": "#A855F7" } }
      ],
      "resumoPorCategoria": [
        { "categoria": { "id": "clx_cat_30", "nome": "Eletrônicos", "cor": "#3B82F6" }, "total": "580.00", "percentual": 90.55 },
        { "categoria": { "id": "clx_cat_25", "nome": "Assinaturas", "cor": "#A855F7" }, "total": "60.50",  "percentual": 9.45 }
      ]
    }
  }
}
```

### 15.5 `PATCH /faturas/:id/pagar` 🔒

```json
{ "contaId": "clx_conta_1", "valor": "640.50", "dataPagamento": "2026-08-08" }
```

Gera uma despesa na conta pagadora e marca a fatura como `PAGA` ou `PAGA_PARCIALMENTE`. As despesas já lançadas no cartão **não** são duplicadas (RN-45).

```json
{
  "success": true,
  "message": "Fatura paga com sucesso.",
  "data": {
    "fatura": { "id": "clx_fat_8", "situacao": "PAGA", "valorPago": "640.50", "pagaEm": "2026-08-08T00:00:00.000Z" },
    "movimentacaoPagamento": { "id": "clx_mov_300", "descricao": "Pagamento fatura Nubank 08/2026", "valor": "640.50", "conta": { "id": "clx_conta_1", "nome": "Banco Principal", "saldoAtual": "3341.85" } }
  }
}
```

`422 REGRA_NEGOCIO` se a fatura já estiver `PAGA` ou se `valor > valorRestante`.

---

## 16. Contas compartilhadas

### 16.1 `GET /contas-compartilhadas` 🔒

```json
{
  "success": true,
  "message": "Contas compartilhadas listadas.",
  "data": {
    "contasCompartilhadas": [
      {
        "id": "clx_grupo_1",
        "nome": "Casa",
        "descricao": "Despesas da casa",
        "imagemUrl": "https://.../grupos/clx_grupo_1.webp",
        "moeda": "BRL",
        "cor": "#2563EB",
        "permiteParticipanteEditarProprias": true,
        "meuPapel": "ADMINISTRADOR",
        "saldoTotal": "1284.60",
        "quantidadeMembros": 3,
        "quantidadeContas": 1,
        "resumoMesAtual": { "receitas": "3200.00", "despesas": "1915.40", "resultado": "1284.60" },
        "criadoEm": "2026-06-15T12:00:00.000Z"
      }
    ]
  }
}
```

`meuPapel` está em cada item para que o frontend decida quais controles exibir sem uma segunda requisição.

### 16.2 `POST /contas-compartilhadas` 🔒

```json
{ "nome": "Casa", "descricao": "Despesas da casa", "moeda": "BRL", "cor": "#2563EB", "permiteParticipanteEditarProprias": true, "criarCategoriasPadrao": true }
```

O criador torna-se `ADMINISTRADOR` (RF-53). Com `criarCategoriasPadrao: true`, as categorias padrão do sistema são copiadas para o escopo do grupo. `201`.

### 16.3 `GET /contas-compartilhadas/:id` 🔒

Detalhe com membros e contas do grupo:

```json
{
  "success": true,
  "message": "Conta compartilhada carregada.",
  "data": {
    "contaCompartilhada": {
      "id": "clx_grupo_1",
      "nome": "Casa",
      "meuPapel": "ADMINISTRADOR",
      "minhasPermissoes": {
        "podeEditar": true, "podeExcluir": true, "podeConvidar": true,
        "podeGerenciarMembros": true, "podeGerenciarCategorias": true,
        "podeCriarMovimentacao": true, "podeEditarMovimentacaoDeTerceiro": true,
        "podeVerAuditoria": true
      },
      "saldoTotal": "1284.60",
      "membros": [
        { "id": "clx_mem_1", "papel": "ADMINISTRADOR", "situacao": "ATIVO", "entrouEm": "2026-06-15T12:00:00.000Z", "usuario": { "id": "clx8a9b0c0001", "nome": "Samuel De Marco", "email": "samuel@exemplo.com", "fotoUrl": null } },
        { "id": "clx_mem_2", "papel": "PARTICIPANTE",  "situacao": "ATIVO", "entrouEm": "2026-06-16T09:30:00.000Z", "usuario": { "id": "clx_u2", "nome": "Ana Souza", "email": "ana@exemplo.com", "fotoUrl": null } }
      ],
      "contas": [
        { "id": "clx_conta_g1", "nome": "Caixa da Casa", "tipo": "CARTEIRA", "saldoAtual": "1284.60", "cor": "#2563EB", "icone": "wallet" }
      ]
    }
  }
}
```

`minhasPermissoes` é a matriz RN-30 já resolvida para o solicitante. O frontend consome esse objeto em vez de reimplementar a matriz — uma única fonte de verdade para as permissões, ainda que a decisão real permaneça no servidor.

### 16.4 `PATCH /contas-compartilhadas/:id` 👑

```json
{ "nome": "Casa Nova", "descricao": "Despesas do apartamento", "cor": "#16A34A", "permiteParticipanteEditarProprias": false }
```

`403 PAPEL_INSUFICIENTE` para não administrador.

### 16.5 `PATCH /contas-compartilhadas/:id/membros/:membroId` 👑

```json
{ "papel": "OBSERVADOR" }
```

Não é possível alterar o próprio papel nem definir `ADMINISTRADOR` por esta rota — a troca de administrador é feita por `/transferir-administracao`, que é atômica e garante RN-28. `422 REGRA_NEGOCIO` nesses casos.

### 16.6 `DELETE /contas-compartilhadas/:id/membros/:membroId` 👑

Marca o membro como `REMOVIDO`. As movimentações permanecem, atribuídas ao usuário original (RN-34). `204`.
`422 ADMINISTRADOR_UNICO` ao tentar remover o administrador (RN-29).

### 16.7 `POST /contas-compartilhadas/:id/transferir-administracao` 👑

```json
{ "novoAdministradorMembroId": "clx_mem_2" }
```

Em uma transação: o atual passa a `PARTICIPANTE` e o destinatário a `ADMINISTRADOR` (RF-57). O novo administrador recebe notificação.

```json
{ "success": true, "message": "Administração transferida para Ana Souza.", "data": { "administradorAnterior": { "membroId": "clx_mem_1", "papel": "PARTICIPANTE" }, "novoAdministrador": { "membroId": "clx_mem_2", "papel": "ADMINISTRADOR" } } }
```

### 16.8 `POST /contas-compartilhadas/:id/sair` 🔒

Marca o próprio vínculo como `SAIU`. `204`.
`422 ADMINISTRADOR_UNICO` — o administrador precisa transferir a administração antes (RN-29).

### 16.9 `DELETE /contas-compartilhadas/:id` 👑

```json
{ "confirmacao": "Casa" }
```

Requer o nome exato do grupo como confirmação. Exclusão lógica, histórico preservado (RN-33). `204`.

### 16.10 `GET /contas-compartilhadas/:id/auditoria` 👑

**Query:** `acao` (repetível), `usuarioId`, `dataInicio`, `dataFim`, `pagina`, `limite`.

```json
{
  "success": true,
  "message": "Auditoria listada.",
  "data": {
    "registros": [
      { "id": "clx_log_1", "acao": "EXCLUIR", "entidadeTipo": "Movimentacao", "entidadeId": "clx_mov_88", "usuario": { "id": "clx8a9b0c0001", "nome": "Samuel De Marco" }, "estadoAnterior": { "descricao": "Mercado", "valor": "120.00" }, "estadoNovo": null, "criadoEm": "2026-07-20T15:42:00.000Z" }
    ]
  },
  "meta": { "paginacao": { "pagina": 1, "limite": 20, "total": 58, "totalPaginas": 3, "temProxima": true, "temAnterior": false } }
}
```

---

## 17. Convites

### 17.1 `POST /contas-compartilhadas/:id/convites` 👑

```json
{ "email": "ana@exemplo.com", "papel": "PARTICIPANTE", "mensagem": "Vem organizar as contas da casa com a gente!" }
```

Envia e-mail com o link `https://<dominio>/convites/<token>`. Validade 7 dias (RN-35).

**`201 Created`**

```json
{
  "success": true,
  "message": "Convite enviado para ana@exemplo.com.",
  "data": { "convite": { "id": "clx_conv_1", "email": "ana@exemplo.com", "papel": "PARTICIPANTE", "situacao": "PENDENTE", "expiraEm": "2026-08-05T12:00:00.000Z", "usuarioJaCadastrado": true } }
}
```

**Erros** — `409 CONVITE_DUPLICADO` (RN-36) · `409 JA_E_MEMBRO` (RN-38) · `403 PAPEL_INSUFICIENTE`.

Convidar e-mail sem cadastro é permitido (RN-37); `usuarioJaCadastrado: false` permite ao frontend explicar que a pessoa precisará se cadastrar.

### 17.2 `GET /convites/recebidos` 🔒

```json
{
  "success": true,
  "message": "Convites recebidos.",
  "data": {
    "convites": [
      { "id": "clx_conv_1", "papel": "PARTICIPANTE", "situacao": "PENDENTE", "mensagem": "Vem organizar as contas da casa!", "expiraEm": "2026-08-05T12:00:00.000Z", "contaCompartilhada": { "id": "clx_grupo_1", "nome": "Casa", "imagemUrl": null, "quantidadeMembros": 2 }, "enviadoPor": { "id": "clx8a9b0c0001", "nome": "Samuel De Marco" }, "criadoEm": "2026-07-29T12:00:00.000Z" }
    ]
  }
}
```

### 17.3 `GET /convites/token/:token` 🔓

Pré-visualização pública, para exibir o convite a quem ainda não tem conta. Retorna apenas nome do grupo, quem convidou, papel e validade — **nunca** dados financeiros.

```json
{ "success": true, "message": "Convite encontrado.", "data": { "convite": { "situacao": "PENDENTE", "papel": "PARTICIPANTE", "expiraEm": "2026-08-05T12:00:00.000Z", "contaCompartilhada": { "nome": "Casa" }, "enviadoPor": { "nome": "Samuel De Marco" }, "emailConvidado": "an***@exemplo.com", "requerCadastro": false } } }
```

O e-mail vem mascarado: a rota é pública e o token pode circular.

### 17.4 `POST /convites/:id/aceitar` 🔒

Cria o vínculo com o papel do convite e marca como `ACEITO` (RN-39). O e-mail autenticado deve coincidir com o do convite, senão `403 PROIBIDO`.

```json
{ "success": true, "message": "Você agora faz parte de \"Casa\".", "data": { "membro": { "id": "clx_mem_2", "papel": "PARTICIPANTE", "situacao": "ATIVO", "contaCompartilhada": { "id": "clx_grupo_1", "nome": "Casa" } } } }
```

`422 CONVITE_EXPIRADO` · `422 REGRA_NEGOCIO` (já respondido).

### 17.5 `POST /convites/:id/recusar` 🔒 · `DELETE /convites/:id` 👑

`recusar` marca como `RECUSADO`; `DELETE` (cancelamento pelo administrador) marca como `CANCELADO`. Ambos `204`.

---

## 18. Metas

### 18.1 `GET /metas` 🔒

**Query:** `situacao` (repetível, padrão `ATIVA`), `contaCompartilhadaId`.

```json
{
  "success": true,
  "message": "Metas listadas.",
  "data": {
    "metas": [
      {
        "id": "clx_meta_1",
        "nome": "Viagem Chile",
        "descricao": "Julho de 2027",
        "valorAlvo": "12000.00",
        "valorAcumulado": "3400.00",
        "valorRestante": "8600.00",
        "percentualProgresso": 28.33,
        "prazoEm": "2027-07-01",
        "diasRestantes": 337,
        "aporteMensalNecessario": "781.82",
        "situacao": "ATIVA",
        "cor": "#16A34A",
        "icone": "plane",
        "quantidadeAportes": 4,
        "criadoEm": "2026-06-20T10:00:00.000Z"
      }
    ]
  }
}
```

`aporteMensalNecessario = valorRestante / meses restantes até o prazo` (arredondado para cima). Sem prazo definido, é `null` (RF-63).

### 18.2 `POST /metas` 🔒

```json
{ "nome": "Viagem Chile", "descricao": "Julho de 2027", "valorAlvo": "12000.00", "prazoEm": "2027-07-01", "cor": "#16A34A", "icone": "plane", "contaCompartilhadaId": null }
```

### 18.3 `POST /metas/:id/aportes` 🔒

```json
{ "tipo": "APORTE", "valor": "500.00", "data": "2026-07-25", "contaId": "clx_conta_3", "observacao": "Bônus", "gerarMovimentacao": true }
```

Com `gerarMovimentacao: true` e `contaId`, debita a conta informada criando a movimentação correspondente (RN-47). Com `false`, apenas registra o progresso — útil para dinheiro guardado fora do sistema.

`tipo: "RESGATE"` inverte o efeito e reduz `valorAcumulado`.

**`201 Created`**

```json
{
  "success": true,
  "message": "Aporte registrado.",
  "data": {
    "aporte": { "id": "clx_apt_5", "tipo": "APORTE", "valor": "500.00", "data": "2026-07-25", "conta": { "id": "clx_conta_3", "nome": "Poupança" }, "movimentacaoId": "clx_mov_310" },
    "meta": { "id": "clx_meta_1", "valorAcumulado": "3900.00", "percentualProgresso": 32.5, "situacao": "ATIVA" }
  }
}
```

Ao atingir o valor-alvo, a meta passa a `CONCLUIDA`, `concluidaEm` é preenchido e o usuário é notificado (RF-64). A resposta reflete a nova situação imediatamente.

`422 REGRA_NEGOCIO` se um resgate deixaria `valorAcumulado` negativo.

### 18.4 `DELETE /metas/:id/aportes/:aporteId` 🔒

Remove o aporte, recalcula `valorAcumulado` e exclui a movimentação vinculada, se houver — tudo na mesma transação. `204`.

---

## 19. Orçamentos

### 19.1 `GET /orcamentos` 🔒

**Query:** `ano`, `mes` (padrão: mês corrente), `contaCompartilhadaId`.

```json
{
  "success": true,
  "message": "Orçamentos listados.",
  "data": {
    "orcamentos": [
      {
        "id": "clx_orc_1",
        "ano": 2026, "mes": 7,
        "valorLimite": "900.00",
        "valorConsumido": "764.30",
        "valorRestante": "135.70",
        "percentualConsumido": 84.92,
        "situacaoAlerta": "ATENCAO",
        "categoria": { "id": "clx_cat_20", "nome": "Mercado", "cor": "#F97316", "icone": "shopping-cart" },
        "projecaoFimMes": "1024.85",
        "vaiEstourar": true
      }
    ]
  },
  "meta": { "totalizadores": { "limiteTotal": "1900.00", "consumidoTotal": "1402.10", "percentualTotal": 73.79 } }
}
```

| `situacaoAlerta` | Faixa |
| ---------------- | ----- |
| `TRANQUILO` | < 80% |
| `ATENCAO` | 80–89,99% |
| `CRITICO` | 90–99,99% |
| `ESTOURADO` | ≥ 100% |

`projecaoFimMes` extrapola o ritmo de gasto até o fim do mês (`consumido / dias decorridos × dias do mês`); `vaiEstourar` indica se a projeção excede o limite. É um sinal de tendência, não previsão — o cliente deve rotulá-lo como estimativa.

### 19.2 `POST /orcamentos` 🔒

```json
{ "categoriaId": "clx_cat_20", "ano": 2026, "mes": 8, "valorLimite": "900.00", "contaCompartilhadaId": null }
```

`409 CONFLITO` se já existir para a combinação categoria + escopo + período (RN-48).

### 19.3 `POST /orcamentos/replicar` 🔒

```json
{ "deAno": 2026, "deMes": 7, "paraAno": 2026, "paraMes": 8, "sobrescrever": false }
```

Copia os orçamentos do período de origem (RF-68). Com `sobrescrever: false`, orçamentos já existentes no destino são preservados e contabilizados como ignorados.

```json
{ "success": true, "message": "3 orçamentos replicados, 1 ignorado por já existir.", "data": { "criados": 3, "ignorados": 1, "orcamentos": [] } }
```

---

## 20. Notificações

### 20.1 `GET /notificacoes` 🔒

**Query:** `apenasNaoLidas` (bool), `tipo` (repetível), `pagina`, `limite`.

```json
{
  "success": true,
  "message": "Notificações listadas.",
  "data": {
    "notificacoes": [
      { "id": "clx_not_1", "tipo": "ORCAMENTO_80", "titulo": "Orçamento de Mercado em 85%", "mensagem": "Você já consumiu R$ 764,30 dos R$ 900,00 previstos para Mercado em julho.", "lida": false, "entidadeTipo": "Orcamento", "entidadeId": "clx_orc_1", "urlAcao": "/orcamentos?ano=2026&mes=7", "criadoEm": "2026-07-27T07:00:00.000Z" },
      { "id": "clx_not_2", "tipo": "DESPESA_A_VENCER", "titulo": "Conta de luz vence em 3 dias", "mensagem": "R$ 218,40 com vencimento em 20/07/2026.", "lida": true, "entidadeTipo": "Movimentacao", "entidadeId": "clx_mov_120", "urlAcao": "/movimentacoes/clx_mov_120", "criadoEm": "2026-07-17T07:05:00.000Z" }
    ]
  },
  "meta": { "paginacao": { "pagina": 1, "limite": 20, "total": 12, "totalPaginas": 1, "temProxima": false, "temAnterior": false }, "naoLidas": 4 }
}
```

`urlAcao` é caminho **relativo** do frontend, para que o cliente navegue internamente sem recarregar a aplicação.

### 20.2 `GET /notificacoes/nao-lidas/contagem` 🔒

Endpoint leve, para o *badge* do cabeçalho. Recomenda-se `refetchInterval` de 60 s no React Query.

```json
{ "success": true, "message": "Contagem obtida.", "data": { "naoLidas": 4 } }
```

### 20.3 `PATCH /notificacoes/:id/ler` · `PATCH /notificacoes/ler-todas` 🔒

`200` com `{ "data": { "atualizadas": 4 } }` na versão em massa.

---

## 21. Dashboard

### 21.1 `GET /dashboard` 🔒

Agrega em **uma** requisição tudo o que a tela inicial precisa, evitando 6 chamadas paralelas em conexão móvel.

**Query:** `dataInicio`, `dataFim` (padrão: mês corrente), `contaCompartilhadaId`.

```json
{
  "success": true,
  "message": "Dashboard carregado.",
  "data": {
    "periodo": { "dataInicio": "2026-07-01", "dataFim": "2026-07-31", "rotulo": "Julho de 2026" },
    "indicadores": {
      "saldoAtual": "4332.35",
      "receitas": "5400.00",
      "despesas": "3218.45",
      "resultado": "2181.55",
      "saldoPrevisto": "3192.35",
      "variacaoReceitas": 4.2,
      "variacaoDespesas": -8.7,
      "taxaPoupanca": 40.4
    },
    "fluxoCaixa": [
      { "mes": "2025-08", "rotulo": "ago/25", "receitas": "5200.00", "despesas": "3890.00", "resultado": "1310.00" },
      { "mes": "2026-07", "rotulo": "jul/26", "receitas": "5400.00", "despesas": "3218.45", "resultado": "2181.55" }
    ],
    "despesasPorCategoria": [
      { "categoria": { "id": "clx_cat_20", "nome": "Mercado", "cor": "#F97316", "icone": "shopping-cart" }, "total": "764.30", "percentual": 23.75, "quantidade": 12 }
    ],
    "receitasPorCategoria": [
      { "categoria": { "id": "clx_cat_1", "nome": "Salário", "cor": "#16A34A", "icone": "banknote" }, "total": "5400.00", "percentual": 100.0, "quantidade": 1 }
    ],
    "ultimasMovimentacoes": [],
    "contas": [
      { "id": "clx_conta_1", "nome": "Banco Principal", "tipo": "CONTA_CORRENTE", "saldoAtual": "4182.35", "cor": "#8B5CF6", "icone": "landmark" }
    ],
    "contasCompartilhadas": [
      { "id": "clx_grupo_1", "nome": "Casa", "meuPapel": "ADMINISTRADOR", "saldoTotal": "1284.60", "quantidadeMembros": 3, "resumoMesAtual": { "receitas": "3200.00", "despesas": "1915.40" } }
    ],
    "metas": [
      { "id": "clx_meta_1", "nome": "Viagem Chile", "valorAlvo": "12000.00", "valorAcumulado": "3900.00", "percentualProgresso": 32.5, "cor": "#16A34A", "icone": "plane" }
    ],
    "orcamentos": [
      { "id": "clx_orc_1", "categoria": { "nome": "Mercado", "cor": "#F97316" }, "valorLimite": "900.00", "valorConsumido": "764.30", "percentualConsumido": 84.92, "situacaoAlerta": "ATENCAO" }
    ],
    "alertas": [
      { "tipo": "ORCAMENTO_80", "severidade": "ATENCAO", "titulo": "Mercado em 85% do orçamento", "urlAcao": "/orcamentos" },
      { "tipo": "DESPESA_A_VENCER", "severidade": "INFORMACAO", "titulo": "3 contas vencem nos próximos 7 dias", "urlAcao": "/movimentacoes?situacao=PENDENTE" },
      { "tipo": "FATURA_A_VENCER", "severidade": "ATENCAO", "titulo": "Fatura Nubank vence em 8 dias", "urlAcao": "/cartoes/clx_cartao_1" }
    ],
    "cartoes": [
      { "id": "clx_cartao_1", "nome": "Nubank", "limiteTotal": "5000.00", "limiteUtilizado": "1240.50", "percentualUtilizado": 24.81, "faturaAtual": { "valorTotal": "640.50", "dataVencimento": "2026-08-08", "situacao": "ABERTA" } }
    ]
  }
}
```

`variacaoReceitas` e `variacaoDespesas` são percentuais em relação ao período anterior de mesma duração. `taxaPoupanca = resultado / receitas × 100`.

`fluxoCaixa` sempre traz 12 pontos, inclusive meses sem movimentação (com zeros) — lacunas distorceriam a leitura do gráfico.

### 21.2 Endpoints granulares

`GET /dashboard/indicadores`, `/dashboard/fluxo-caixa` (query `meses`, padrão 12) e `/dashboard/por-categoria` (query `tipo`, padrão `DESPESA`) retornam apenas o respectivo bloco. Use-os quando o usuário altera um filtro específico, em vez de recarregar o dashboard inteiro.

---

## 22. Relatórios

### 22.1 `GET /relatorios/mensal` 🔒

**Query:** `ano` (obrig.), `mes` (obrig.), `contaCompartilhadaId`.

```json
{
  "success": true,
  "message": "Relatório mensal gerado.",
  "data": {
    "periodo": { "ano": 2026, "mes": 7, "rotulo": "Julho de 2026" },
    "resumo": { "receitas": "5400.00", "despesas": "3218.45", "resultado": "2181.55", "saldoInicial": "2150.80", "saldoFinal": "4332.35" },
    "porCategoria": {
      "receitas": [ { "categoria": { "nome": "Salário", "cor": "#16A34A" }, "total": "5400.00", "percentual": 100.0, "quantidade": 1 } ],
      "despesas": [ { "categoria": { "nome": "Mercado", "cor": "#F97316" }, "total": "764.30", "percentual": 23.75, "quantidade": 12 } ]
    },
    "porConta": [ { "conta": { "nome": "Banco Principal" }, "receitas": "5400.00", "despesas": "2890.15", "resultado": "2509.85" } ],
    "porDia": [ { "data": "2026-07-01", "receitas": "0.00", "despesas": "45.90", "resultado": "-45.90" } ],
    "maioresDespesas": [ { "id": "clx_mov_101", "descricao": "Notebook Dell (3/10)", "valor": "580.00", "data": "2026-07-10", "categoria": { "nome": "Eletrônicos" } } ],
    "comparativoMesAnterior": { "receitas": { "atual": "5400.00", "anterior": "5180.00", "variacao": 4.25 }, "despesas": { "atual": "3218.45", "anterior": "3524.10", "variacao": -8.67 } }
  }
}
```

### 22.2 `GET /relatorios/anual` 🔒

**Query:** `ano` (obrig.).

```json
{
  "success": true,
  "message": "Relatório anual gerado.",
  "data": {
    "ano": 2026,
    "resumo": { "receitas": "38400.00", "despesas": "24180.55", "resultado": "14219.45", "mediaMensalReceitas": "5485.71", "mediaMensalDespesas": "3454.36", "taxaPoupancaMedia": 37.03 },
    "porMes": [ { "mes": 1, "rotulo": "jan", "receitas": "5180.00", "despesas": "3524.10", "resultado": "1655.90" } ],
    "porCategoria": [ { "categoria": { "nome": "Mercado", "cor": "#F97316" }, "total": "5842.30", "percentual": 24.16, "mediaMensal": "834.61" } ],
    "melhorMes": { "mes": 7, "resultado": "2181.55" },
    "piorMes": { "mes": 3, "resultado": "-320.40" }
  }
}
```

### 22.3 `GET /relatorios/comparativo` 🔒

**Query:** `periodoAInicio`, `periodoAFim`, `periodoBInicio`, `periodoBFim`, `agruparPor` (`CATEGORIA`|`CONTA`|`MES`).

```json
{
  "success": true,
  "message": "Comparativo gerado.",
  "data": {
    "periodoA": { "rotulo": "1º sem. 2026", "receitas": "33000.00", "despesas": "20962.10" },
    "periodoB": { "rotulo": "1º sem. 2025", "receitas": "29400.00", "despesas": "19880.40" },
    "itens": [ { "rotulo": "Mercado", "valorA": "4980.30", "valorB": "4210.80", "variacaoAbsoluta": "769.50", "variacaoPercentual": 18.27 } ]
  }
}
```

### 22.4 `POST /relatorios/exportar` 🔒

```json
{ "tipo": "MENSAL", "formato": "PDF", "parametros": { "ano": 2026, "mes": 7 }, "incluirGraficos": true }
```

| Campo | Valores |
| ----- | ------- |
| `tipo` | `MENSAL` \| `ANUAL` \| `POR_CATEGORIA` \| `POR_CONTA` \| `FLUXO_CAIXA` \| `MOVIMENTACOES` |
| `formato` | `PDF` \| `XLSX` \| `CSV` |

Relatórios pequenos respondem `200` com o binário. Relatórios grandes (> 5 000 linhas) respondem `202 Accepted` e enviam link por e-mail:

```json
{ "success": true, "message": "Relatório em processamento. Você receberá o arquivo por e-mail.", "data": { "processamentoId": "clx_proc_1", "estimativaSegundos": 45 } }
```

O cliente deve tratar os dois casos — verificar o status, não presumir o binário.

---

## 23. Pesquisa global

### 23.1 `GET /pesquisa` 🔒

**Query:** `termo` (obrig., ≥ 2 caracteres), `tipos` (repetível: `MOVIMENTACAO`, `CATEGORIA`, `CONTA`, `CARTAO`, `CONTA_COMPARTILHADA`, `META`, `USUARIO`), `limitePorTipo` (padrão 5, máx. 20).

```json
{
  "success": true,
  "message": "Pesquisa realizada.",
  "data": {
    "termo": "mercado",
    "resultados": {
      "movimentacoes": [ { "id": "clx_mov_100", "descricao": "Mercado do mês", "valor": "487.90", "tipo": "DESPESA", "data": "2026-07-15", "conta": { "nome": "Banco Principal" }, "urlAcao": "/movimentacoes/clx_mov_100" } ],
      "categorias": [ { "id": "clx_cat_20", "nome": "Mercado", "cor": "#F97316", "urlAcao": "/movimentacoes?categoriaId=clx_cat_20" } ],
      "contas": [], "cartoes": [], "contasCompartilhadas": [], "metas": [], "usuarios": []
    },
    "totalEncontrado": 14
  }
}
```

A pesquisa respeita rigorosamente o escopo de acesso do solicitante (RF-81): retorna apenas recursos próprios e de grupos dos quais é membro ativo. O bloco `usuarios` traz somente membros de grupos em comum — nunca a base de usuários.

---

## 24. Auditoria

Exposta apenas no escopo de grupo, via `GET /contas-compartilhadas/:id/auditoria` (§16.10). Não há endpoint global de auditoria na v1.x.

---

## 25. Saúde

### 25.1 `GET /saude` 🔓

```json
{ "success": true, "message": "Serviço operacional.", "data": { "status": "ok", "versao": "1.0.0", "ambiente": "producao", "tempoAtivoSegundos": 184320 } }
```

### 25.2 `GET /saude/prontidao` 🔓

```json
{
  "success": true,
  "message": "Serviço pronto.",
  "data": {
    "status": "pronto",
    "verificacoes": {
      "banco": { "status": "ok", "latenciaMs": 3 },
      "migrations": { "status": "ok", "pendentes": 0 },
      "armazenamento": { "status": "ok", "gravavel": true }
    }
  }
}
```

**`503 SERVICO_INDISPONIVEL`** quando alguma verificação falha:

```json
{ "success": false, "message": "Serviço não está pronto.", "codigo": "SERVICO_INDISPONIVEL", "data": { "status": "indisponivel", "verificacoes": { "banco": { "status": "erro", "mensagem": "Conexão recusada." } } } }
```

Este endpoint é o portão do deploy: falha aqui aciona *rollback* automático ([08-CICD.md](08-CICD.md)). Ele **não** exige autenticação — mas também não expõe nome de host, credencial ou versão de dependência.

---

## 26. Rate limiting

| Escopo | Janela | Limite | Chave |
| ------ | ------ | ------ | ----- |
| Global (autenticado) | 15 min | 1 000 req | usuário |
| Global (anônimo) | 15 min | 300 req | IP |
| `POST /autenticacao/entrar` | 15 min | 5 tentativas | IP + e-mail |
| `POST /autenticacao/cadastrar` | 1 h | 5 | IP |
| `POST /autenticacao/esqueci-senha` | 1 h | 3 | IP + e-mail |
| `POST /autenticacao/renovar` | 15 min | 30 | IP |
| Uploads (anexos, fotos) | 1 h | 50 | usuário |
| `POST /relatorios/exportar` | 1 h | 10 | usuário |
| `POST .../convites` | 1 h | 20 | usuário |

**`429 Too Many Requests`**

```json
{ "success": false, "message": "Muitas tentativas. Tente novamente em 12 minutos.", "codigo": "LIMITE_EXCEDIDO", "meta": { "limite": 5, "restante": 0, "reiniciaEm": "2026-07-29T14:15:00.000Z", "retryAfterSegundos": 720 } }
```

Com `Retry-After: 720`. A chave composta `IP + e-mail` no login evita que um atacante distribuído bloqueie a conta de uma vítima apenas errando a senha de propósito.

---

**Documentos relacionados:** [01-SPECIFICATION.md](01-SPECIFICATION.md) · [02-ARCHITECTURE.md](02-ARCHITECTURE.md) · [03-DATABASE.md](03-DATABASE.md) · [09-CLAUDE.md](09-CLAUDE.md)
