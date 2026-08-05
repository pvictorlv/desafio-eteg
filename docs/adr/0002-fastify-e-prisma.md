# 0002 — Fastify e Prisma na API

**Status:** aceita · 03/08/2026

## Contexto

A API tem duas rotas de negócio e precisa de validação de entrada, respostas
de erro consistentes, documentação e acesso a Postgres. O enunciado pede
Node.js e diz que o projeto continua com outra equipe — o que pesa a favor do
que é fácil de ler sem tutorial.

## Decisão

**Fastify 5** com `fastify-type-provider-zod`. O esquema Zod da rota vira, ao
mesmo tempo, o validador da entrada, o serializador da saída, o tipo de
`request.body` no editor e a documentação OpenAPI. Uma declaração, quatro
usos, e nada para manter sincronizado.

**Prisma 7** com o adaptador `@prisma/adapter-pg`. Migrações versionadas em
arquivo, tipos gerados do esquema e nenhuma string de SQL montada à mão — o
que fecha a porta de injeção sem exigir disciplina de ninguém. A partir da
versão 7 não há mais engine binária, então a imagem fica menor e a URL de
conexão vira um parâmetro explícito, que é o que permite apontar os testes
para um container descartável.

## Consequências

**A favor.** Rotas tipadas de ponta a ponta e documentação que não descola do
código: mudar o contrato sem atualizar o `/docs` é impossível, porque são a
mesma coisa. O Prisma dá `P2002` na violação de unicidade, e é dele que nasce
o `409` (ver [0004](0004-unicidade-no-banco.md)).

**Contra.** Express tem mais respostas prontas na internet, e o Prisma esconde
o SQL — uma consulta pesada no futuro vai exigir descer ao `$queryRaw` e
medir. Nenhuma consulta deste projeto chega perto disso.

O CLI do Prisma pesa na imagem, porque as migrações rodam no boot. O custo
está registrado em [0006](0006-imagem-unica.md).
