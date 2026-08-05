# Como contribuir

O enunciado diz que o projeto continua com outra equipe. Este arquivo é para
essa equipe.

## Preparar a máquina

Node 24 (veja `.nvmrc`), pnpm 9 e Docker. O passo a passo está no
[README](README.md#desenvolvimento).

Um detalhe que pega quem clona: **rode `pnpm build` antes de `pnpm test`.** A
API importa `@desafio-eteg/contratos` pelo `dist`, exatamente como em
produção, e o cliente do Prisma é gerado no build. Sem esse passo, os testes
falham reclamando de um módulo que não existe.

## Antes de abrir o pull request

```bash
pnpm build
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

São os mesmos comandos que a esteira roda, na mesma ordem. Rodar antes evita
o vaivém de "o CI quebrou".

## Padrões

**Tudo em português.** Nomes de variável, mensagem de commit, comentário,
documentação e vocabulário de domínio. Metade em inglês e metade em português
é o pior dos dois.

**Nomes concretos.** `retryAfterMs` em vez de `timeout`, `corPreferidaId` em
vez de `id`. `dados`, `item` e `info` não dizem nada.

**Comentário explica o porquê, não o quê.** O código já diz o que faz. Um
comentário que repete a linha de baixo é dívida: ele mente na primeira
alteração. Escreva o que não cabe no código — a alternativa descartada, o bug
que a linha evita, o motivo de o caminho óbvio não servir.

**Uma regra, um lugar.** Validação nova vai para `packages/contratos`, não
para a rota nem para o formulário. É o que impede as duas pontas de
divergirem.

**Erro de negócio não conhece HTTP.** Serviços lançam `ErroDeNegocio`; quem
traduz para status e problem+json é `plugins/erros.ts`, e só ele.

**Dado pessoal não entra em log.** Nem em relatório de erro do front. Campo
novo com dado de pessoa entra na lista de `redact` no mesmo commit — leia a
[ADR 0007](docs/adr/0007-pii-e-logs.md).

## Testes

**Teste comportamento, não implementação.** O teste bom quebra quando o
produto quebra, e sobrevive a uma refatoração. Afirme sobre o que a pessoa vê
e sobre o que a API responde, não sobre qual função foi chamada.

**Todo bug corrigido ganha um teste** que falha antes da correção. É o que
impede a segunda visita do mesmo bug.

Nome de teste no presente do indicativo, terceira pessoa, descrevendo o
comportamento: `recusa o segundo cadastro do mesmo CPF`. Nada de "deve" nem de
"should".

Onde escrever:

| Tipo          | Onde                 | Quando                                              |
| ------------- | -------------------- | --------------------------------------------------- |
| Unitário      | `packages/contratos` | Regra pura: validação, normalização, formatação     |
| Integração    | `apps/api/testes`    | Contrato HTTP, com Postgres real via Testcontainers |
| Componente    | `apps/web/testes`    | O que a pessoa vê e faz na tela                     |
| Ponta a ponta | `e2e/specs`          | Só o fluxo principal. É o teste mais caro de manter |

## Commits e branches

Branch por assunto, prefixada por tipo: `feat/`, `fix/`, `test/`, `chore/`,
`docs/`.

Mensagem no formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/),
com o assunto no imperativo e em minúscula:

```
feat(web): destaca o campo recusado pela API
```

Corpo só quando o "porquê" não se lê no diff. Duas ou três linhas bastam. Se
precisar de mais, o lugar é uma ADR.

## Decisões de arquitetura

Escolha que outra pessoa vai querer entender daqui a seis meses vira um
arquivo em [`docs/adr`](docs/adr/README.md): contexto, decisão e consequências
— inclusive as ruins, que são as que ninguém escreve e todo mundo descobre
sozinho.

Decisão revista não é apagada: ganha um arquivo novo, e o antigo passa a
`Substituída`.
