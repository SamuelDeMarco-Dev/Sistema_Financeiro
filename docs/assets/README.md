# assets/

Imagens, diagramas e mockups referenciados pelos documentos de `docs/`.

## Estrutura

```
assets/
├── README.md
└── diagramas/     ← exportações de diagramas (PNG/SVG)
```

## Convenções

| Regra      | Detalhe                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| Nomes      | `kebab-case` sem acento: `fluxo-transferencia.png`                              |
| Prefixo    | Numere pelo documento de origem: `03-er-completo.svg`, `08-pipeline-deploy.png` |
| Formato    | **SVG** para diagramas (escala sem perda); **PNG** para capturas de tela        |
| Tamanho    | Máximo 500 KB por arquivo. Comprima antes de versionar                          |
| Referência | Sempre relativa: `![Diagrama ER](assets/diagramas/03-er-completo.svg)`          |

## Diagramas em Mermaid

Os diagramas de arquitetura, ER, sequência e fluxo estão escritos **em Mermaid, dentro dos próprios documentos** — o GitHub os renderiza nativamente e eles versionam como texto, aparecendo no diff quando mudam.

Só exporte para imagem quando:

- o diagrama for consumido fora do repositório (apresentação, wiki externa);
- for um mockup ou captura de tela, que não tem representação textual.

Diagramas já existentes em Mermaid nos documentos:

| Documento                                   | Diagrama                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| [02-ARCHITECTURE.md](../02-ARCHITECTURE.md) | Topologia da aplicação · camadas · ciclo de vida da requisição · fluxo de autenticação |
| [03-DATABASE.md](../03-DATABASE.md)         | Diagrama ER completo                                                                   |
| [06-MILESTONES.md](../06-MILESTONES.md)     | Grafo de dependências entre Milestones                                                 |
| [05-DEVELOPMENT.md](../05-DEVELOPMENT.md)   | Fluxo Git (gitGraph)                                                                   |
| [08-CICD.md](../08-CICD.md)                 | Pipeline de CI/CD e deploy                                                             |
