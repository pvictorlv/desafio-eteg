# Cadastro de clientes

Aplicação de cadastro de clientes construída para o desafio técnico da ETEG.

Um formulário coleta **nome completo, CPF, e-mail, cor preferida e observações**
e grava em Postgres. Cada CPF e cada e-mail podem ser cadastrados **uma única
vez**, e quem preenche recebe a confirmação na hora.

> Estado atual: API e formulário web prontos. Faltam os testes automatizados e
> a imagem Docker.

## Stack

| Camada   | Escolha                     | Por quê                                                             |
| -------- | --------------------------- | ------------------------------------------------------------------- |
| Monorepo | pnpm workspaces             | Front, API e contrato no mesmo repositório, como o desafio pede     |
| Contrato | Zod em `packages/contratos` | Uma regra de validação só, usada pelo formulário e pela API         |
| API      | Fastify 5 + TypeScript      | Tipagem ponta a ponta nas rotas e OpenAPI gerado do próprio esquema |
| Front    | React 19 + Vite             | SPA estática, que a própria API vai servir em produção              |
| Formul.  | React Hook Form + Zod       | O resolver é o mesmo esquema que a rota valida                      |
| Dados    | TanStack Query              | Cache das cores e controle do envio, sem repetição automática       |
| Banco    | Postgres 17 + Prisma 7      | Migrações versionadas; a versão 7 dispensa engine binária           |

## Como rodar

Requisitos: Node 24 (veja `.nvmrc`), pnpm 9 e um Postgres acessível.

```bash
pnpm install

# Sobe um Postgres local já configurado
docker compose up -d banco

cd apps/api
cp .env.example .env

pnpm prisma:deploy   # aplica as migrações
pnpm seed            # cadastra as sete cores do arco-íris
pnpm dev             # API em http://localhost:3000
```

Com a API no ar, em outro terminal:

```bash
cd apps/web
pnpm dev             # formulário em http://localhost:5173
```

O Vite faz proxy de `/api` para a porta 3000, então o front chama a mesma
origem que usará em produção e o navegador nem passa por CORS.

A documentação interativa da API fica em <http://localhost:3000/docs>.

## Endpoints

| Método | Rota            | O que faz                                                                |
| ------ | --------------- | ------------------------------------------------------------------------ |
| `GET`  | `/api/cores`    | Lista as cores disponíveis. Cache de 5 minutos                           |
| `POST` | `/api/clientes` | Cadastra um cliente. `201` no sucesso, `409` se CPF ou e-mail já existem |
| `GET`  | `/saude`        | Liveness: o processo está no ar                                          |
| `GET`  | `/saude/pronto` | Readiness: o banco responde                                              |
| `GET`  | `/docs`         | Documentação OpenAPI                                                     |

Erros seguem [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) (`application/problem+json`)
e trazem um `codigo` estável, para o front reagir sem interpretar texto.

## Decisões que valem explicar

**As cores ficam no banco, não em um enum.** O enunciado avisa que a lista "pode
mudar posteriormente". Uma tabela com endpoint próprio permite mudar sem deploy.

**A unicidade é do banco.** Índice único em `cpf` e em `email`; o `409` nasce da
violação da constraint, não de uma consulta prévia. Consultar antes de inserir
deixa uma janela em que dois envios simultâneos do mesmo CPF passariam os dois.

**Validação escrita uma vez.** O mesmo esquema Zod valida o formulário e o corpo
da requisição, e ainda gera a documentação. Não há como as duas pontas
divergirem sem quebrar o build.

**Dado pessoal não vai para o log.** Nome, CPF e e-mail são redigidos na origem.
Log sai da máquina; depois que vazou, some com dificuldade.

**O front decide pelo `codigo`, não pelo texto.** Um `409` chega com o campo
culpado no problem+json, e é esse campo que o formulário destaca. Procurar a
palavra "CPF" na mensagem quebraria na primeira vez que alguém melhorasse a
redação de um erro no servidor.

**O envio não é repetido sozinho.** Leituras podem ser tentadas de novo depois
de uma falha de rede; o cadastro, não. Uma repetição automática depois de um
timeout grava duas vezes ou devolve um `409` que a pessoa não provocou.

## O formulário

Uma tela só. O CPF ganha máscara enquanto se digita e viaja sem ela; as cores
vêm de `GET /api/cores` e alimentam tanto os botões quanto a régua colorida do
topo. Enviado com sucesso, o formulário **sai da tela** e dá lugar à
confirmação com o protocolo — em vez de continuar preenchido, convidando a um
segundo envio.

Acessibilidade entra como requisito, não como enfeite: rótulo ligado a cada
campo, erro anunciado por `role="alert"`, foco levado ao primeiro campo
inválido, navegação por setas entre as cores, contraste conferido nos dois
temas e movimento desligado para quem pede `prefers-reduced-motion`. A cor
escolhida nunca é sinalizada só por cor — há anel e negrito junto.

## Estrutura

```
apps/api            API Fastify (rotas -> serviços -> repositórios)
apps/web            SPA React (Vite), consome a API
packages/contratos  Esquemas Zod e validação de CPF compartilhados
```

## Scripts

```bash
pnpm build       # compila todos os pacotes
pnpm typecheck   # checagem de tipos
pnpm lint        # ESLint com regras que usam informação de tipo
```
