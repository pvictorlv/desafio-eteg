# Cadastro de clientes

Formulário público de cadastro, construído para o desafio técnico da ETEG.

Coleta **nome completo, CPF, e-mail, cor preferida e observações**, grava em
Postgres e confirma na hora. Cada CPF e cada e-mail podem ser cadastrados
**uma única vez** — garantia do banco, não da tela.

Tudo sobe com um comando:

```bash
docker compose up --build
```

A aplicação fica em <http://localhost:8080> e a documentação da API em
<http://localhost:8080/docs>. Não é preciso instalar Node, pnpm nem Postgres.

## O caso de uso

O enunciado é a carta de um cliente, e três frases dela decidiram o desenho:

> "cor preferida (entre as cores disponíveis em um arco-íris, **isso pode
> mudar posteriormente**)"

As cores moram no banco, com endpoint próprio. Trocar o catálogo é um
`INSERT`, sem deploy ([ADR 0005](docs/adr/0005-cores-como-dado.md)).

> "um cliente consiga preencher o formulário **uma única vez**"

Índice único em CPF e em e-mail. O `409` nasce da violação da constraint, não
de uma consulta prévia — consultar antes deixa uma janela em que dois envios
simultâneos passariam os dois ([ADR 0004](docs/adr/0004-unicidade-no-banco.md)).

> "vai subir a **imagem** em um serviço terceirizado"

Uma imagem só, servindo API e tela na mesma porta, com as migrações rodando no
boot ([ADR 0006](docs/adr/0006-imagem-unica.md)).

## Stack

| Camada   | Escolha                     | Por quê                                                             |
| -------- | --------------------------- | ------------------------------------------------------------------- |
| Monorepo | pnpm workspaces             | Front, API e contrato no mesmo repositório, como o desafio pede     |
| Contrato | Zod em `packages/contratos` | Uma regra de validação só, usada pelo formulário e pela API         |
| API      | Fastify 5 + TypeScript      | Tipagem ponta a ponta nas rotas e OpenAPI gerado do próprio esquema |
| Front    | React 19 + Vite             | SPA estática, que a própria API serve em produção                   |
| Formul.  | React Hook Form + Zod       | O resolver é o mesmo esquema que a rota valida                      |
| Dados    | TanStack Query              | Cache das cores e controle do envio, sem repetição automática       |
| Banco    | Postgres 17 + Prisma 7      | Migrações versionadas; a versão 7 dispensa engine binária           |
| Testes   | Vitest + Testcontainers     | Integração contra um Postgres real, e não contra um mock            |
| E2E      | Playwright                  | O cadastro exercitado pelo navegador, sobre a imagem publicável     |

O raciocínio de cada escolha, e o que se paga por ela, está em
[docs/adr](docs/adr/README.md). A arquitetura e o fluxo do cadastro estão em
[docs/arquitetura.md](docs/arquitetura.md).

## Desenvolvimento

Requisitos: Node 24 (veja `.nvmrc`), pnpm 9 e Docker.

```bash
pnpm install
pnpm build                      # compila os contratos e gera o cliente Prisma

docker compose up -d banco      # um Postgres já configurado

cd apps/api
cp .env.example .env
pnpm prisma:deploy              # aplica as migrações
pnpm seed                       # cadastra as sete cores do arco-íris
pnpm dev                        # API em http://localhost:3000
```

Com a API no ar, em outro terminal:

```bash
cd apps/web
pnpm dev                        # formulário em http://localhost:5173
```

O Vite faz proxy de `/api` para a porta 3000, então o front chama a mesma
origem que usará em produção e o navegador nem passa por CORS.

> A porta 5432 costuma estar ocupada por um Postgres instalado na máquina.
> Suba o container em outra: `POSTGRES_PORT=5433 docker compose up -d banco`,
> ajustando o `DATABASE_URL` do `.env` para a mesma porta.

## Variáveis de ambiente

Todas são lidas e validadas uma vez, no boot. Faltando uma obrigatória, a
aplicação não sobe — errar cedo e alto é melhor que descobrir no primeiro
request, com o healthcheck já verde.

| Variável             | Obrigatória | Padrão        | Para quê                                                       |
| -------------------- | ----------- | ------------- | -------------------------------------------------------------- |
| `DATABASE_URL`       | sim         | —             | Conexão com o Postgres                                         |
| `PORT`               | não         | `3000`        | Porta HTTP                                                     |
| `NODE_ENV`           | não         | `development` | `development` liga o log legível; `production` confia no proxy |
| `ORIGENS_PERMITIDAS` | não         | vazio         | Origens liberadas no CORS. Vazio = só a mesma origem           |
| `NIVEL_DE_LOG`       | não         | `info`        | `fatal` a `trace`                                              |
| `DIRETORIO_DO_FRONT` | não         | —             | SPA compilada servida pela API. Preenchida na imagem           |
| `SENTRY_DSN`         | não         | —             | Ausente, o envio de erros fica desligado                       |

## Endpoints

| Método | Rota            | O que faz                                                                |
| ------ | --------------- | ------------------------------------------------------------------------ |
| `GET`  | `/api/cores`    | Lista as cores disponíveis. Cache de 5 minutos                           |
| `POST` | `/api/clientes` | Cadastra um cliente. `201` no sucesso, `409` se CPF ou e-mail já existem |
| `GET`  | `/saude`        | Liveness: o processo está no ar                                          |
| `GET`  | `/saude/pronto` | Readiness: o banco responde                                              |
| `GET`  | `/docs`         | Documentação OpenAPI, gerada dos mesmos esquemas Zod                     |

Erros seguem [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)
(`application/problem+json`) e trazem um `codigo` estável, para o cliente
reagir sem interpretar texto. O catálogo está em
[docs/erros.md](docs/erros.md).

## Testes

```bash
pnpm build      # os testes usam os contratos compilados e o cliente Prisma
pnpm test       # unitários, integração e componentes
pnpm test:e2e   # navegador, com a aplicação já no ar
```

| Onde                        | O que cobre                                                     |
| --------------------------- | --------------------------------------------------------------- |
| `packages/contratos`        | Validação de CPF e normalização dos campos                      |
| `apps/api` (Testcontainers) | `201`, os dois `409`, `422` de validação e de cor, cores, saúde |
| `apps/web` (jsdom)          | O formulário como a pessoa o usa, incluindo a recusa por CPF    |
| `e2e` (Playwright)          | Cadastro, repetição do mesmo CPF e mensagem de duplicado        |

A integração da API **exige Docker**: sobe um `postgres:17-alpine`
descartável, aplica as migrações versionadas e roda contra ele. O `409` nasce
do índice único, então um banco em memória testaria outra coisa.

O e2e roda contra a aplicação já no ar. Com o compose:

```bash
docker compose up -d --build
URL_DA_APLICACAO=http://localhost:8080 pnpm test:e2e
```

## Deploy

O `Dockerfile` produz **uma imagem** com API e tela. Ela aplica as migrações e
garante as cores no boot, então subir é apontar para o banco:

```bash
docker run -p 8080:3000 \
  -e DATABASE_URL="postgresql://usuario:senha@host:5432/eteg" \
  ghcr.io/pvictorlv/desafio-eteg:latest
```

A imagem roda como usuário não-root e traz `HEALTHCHECK` apontando para
`/saude` — o liveness, que não depende do banco: um Postgres fora do ar não
deve fazer o orquestrador reiniciar uma aplicação que está de pé.

Cada push na `main` publica no GHCR; tags `v*` publicam a versão semântica.

## Estrutura

```
apps/api            API Fastify (rotas -> serviços -> repositórios)
apps/web            SPA React (Vite), servida pela API em produção
packages/contratos  Esquemas Zod e validação de CPF compartilhados
e2e                 Playwright, sobre a aplicação já no ar
docs/adr            Decisões de arquitetura
docker              Entrypoint da imagem
```

## Acessibilidade

Entrou como requisito, não como enfeite: rótulo ligado a cada campo, erro
anunciado por `role="alert"`, foco levado ao primeiro campo inválido,
navegação por setas entre as cores, contraste conferido nos dois temas e
movimento desligado para quem pede `prefers-reduced-motion`. A cor escolhida
nunca é sinalizada só por cor — há anel e negrito junto.

## O que ficou de fora

Autenticação, edição e exclusão de cadastro, fila e multi-tenancy. O motivo de
cada uma está em [docs/arquitetura.md](docs/arquitetura.md#o-que-ficou-de-fora-e-por-quê).
Resumindo: nenhuma tem requisito no enunciado, e código sem quem sirva é
código para manter de graça.
