# 0006 — Imagem única e migrações no boot

**Status:** aceita · 04/08/2026

## Contexto

Do enunciado: "o Jorge disse que vai hospedar isso pra mim. Ele mencionou um
tal de Docker, disse que vai subir a **imagem** em um serviço terceirizado."
Singular. O destino é um PaaS onde se aponta um repositório, sai uma imagem e
ela sobe — sem orquestração, sem proxy reverso para configurar, sem etapa
manual entre o deploy e a aplicação no ar.

Duas imagens (uma de API, uma de Nginx servindo a tela) seriam mais
convencionais, e transformariam o deploy em um problema de rede que o Jorge
não pediu para ter.

## Decisão

**Uma imagem.** A API registra `@fastify/static` sobre o `dist` do Vite e
devolve `index.html` para todo caminho que não seja arquivo nem rota de
`/api`. O `Dockerfile` é multi-stage: instala com o lockfile congelado,
compila os três pacotes e usa `pnpm deploy --prod` para resolver os links do
workspace em diretórios de verdade. O runner é `node:24-alpine`, roda como o
usuário `node` e traz `HEALTHCHECK` apontando para `/saude`.

**As migrações rodam no boot**, no entrypoint, antes de o servidor subir. O
mesmo passo garante as cores do arco-íris, com `upsert` por slug.

## Consequências

**A favor.** Front e API na mesma origem: o CORS deixa de existir e o CSP do
helmet fica de fato fechado em `'self'`. Subir a aplicação é `docker run` com
uma variável de ambiente. O banco nunca fica atrás do código, porque o
processo não atende antes de migrar.

**Contra, e é o ponto importante.** Migrar no boot **não escala para várias
réplicas**: subindo juntas, todas tentam migrar ao mesmo tempo. O
`_prisma_migrations` do Prisma tem trava e o segundo processo espera em vez de
corromper, mas o desenho certo a partir daí é outro — um job de release antes
do rollout, ou um init container. O gatilho para mudar é a segunda réplica,
não uma data.

A imagem carrega o CLI do Prisma para conseguir migrar, e ele traz junto o
Prisma Studio, que nunca roda em produção. São cerca de 150 MB pagos por
comodidade de deploy. Tirando as migrações do boot, some com eles.

O cache dos arquivos é decidido por arquivo: o bundle tem hash no nome e vale
um ano com `immutable`; o `index.html` sai com `no-cache`, porque é ele que
aponta para os demais e um cache longo prenderia o navegador na versão
anterior.
