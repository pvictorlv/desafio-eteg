# syntax=docker/dockerfile:1

# Uma imagem só, servindo a API e a tela na mesma porta — é a "imagem" que o
# Jorge vai subir num serviço terceirizado. Ver docs/adr/0006-imagem-unica.md.

ARG NODE=node:24-alpine

# --------------------------------------------------------------------------
# Dependências: camada própria para o cache sobreviver a mudanças de código.
# --------------------------------------------------------------------------
FROM ${NODE} AS dependencias

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /repositorio

# Só os manifestos: enquanto o lockfile não mudar, o install não roda de novo.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contratos/package.json packages/contratos/
COPY e2e/package.json e2e/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# --------------------------------------------------------------------------
# Construção: compila os três pacotes e monta o diretório de execução.
# --------------------------------------------------------------------------
FROM dependencias AS construcao

COPY tsconfig.base.json ./
COPY packages/contratos packages/contratos
COPY apps/api apps/api
COPY apps/web apps/web

# Nesta ordem porque a API e o front dependem dos contratos compilados.
RUN pnpm --filter @desafio-eteg/contratos build \
  && pnpm --filter @desafio-eteg/api build \
  && pnpm --filter @desafio-eteg/web build

# `deploy` resolve os links do workspace em diretórios de verdade: sem isso, a
# imagem levaria o monorepo inteiro para conseguir enxergar @desafio-eteg/contratos.
RUN pnpm --filter @desafio-eteg/api --prod deploy /aplicacao

# --------------------------------------------------------------------------
# Execução: só o que o processo precisa em produção.
# --------------------------------------------------------------------------
FROM ${NODE} AS execucao

ENV NODE_ENV=production
ENV PORT=3000
# A tela sai da mesma origem que a API: sem CORS, e o CSP do helmet segue fechado.
ENV DIRETORIO_DO_FRONT=/aplicacao/publico

WORKDIR /aplicacao

COPY --from=construcao /aplicacao/node_modules ./node_modules
COPY --from=construcao /aplicacao/package.json ./package.json
COPY --from=construcao /aplicacao/dist ./dist
# O `migrate deploy` do entrypoint precisa das migrações e da configuração.
COPY --from=construcao /aplicacao/prisma ./prisma
COPY --from=construcao /aplicacao/prisma.config.ts ./prisma.config.ts
COPY --from=construcao /repositorio/apps/web/dist ./publico

COPY docker/entrada.sh /usr/local/bin/entrada.sh
RUN chmod +x /usr/local/bin/entrada.sh

# `node` já existe na imagem base. Rodar como root dá ao invasor de um dia
# ruim a máquina inteira em vez de um processo.
USER node

EXPOSE 3000

# Bate no liveness, que não depende do banco: o container é reiniciado quando
# o processo trava, e não quando o Postgres cai.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node --eval "fetch('http://127.0.0.1:' + process.env.PORT + '/saude').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrada.sh"]
CMD ["node", "dist/main.js"]
