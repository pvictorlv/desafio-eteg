# 0001 — Monorepo com pnpm workspaces

**Status:** aceita · 03/08/2026

## Contexto

O enunciado pede o código-fonte em um repositório único e exige TypeScript,
React e Node.js. São três artefatos com ciclos de vida próprios — a API, a
tela e as regras que as duas usam — e uma regra de validação que precisa valer
igual dos dois lados.

Duas saídas óbvias: uma pasta só, com tudo misturado e um `package.json`; ou
repositórios separados, com o contrato publicado num registro privado.

## Decisão

Um repositório com três pacotes em pnpm workspaces: `apps/api`, `apps/web` e
`packages/contratos`, mais `e2e` para o teste de navegador.

O pnpm em vez de npm ou yarn pelo `node_modules` sem içamento: um pacote só
enxerga o que declarou. Dependência usada sem estar no `package.json` quebra
na hora, e não no primeiro deploy.

## Consequências

**A favor.** Uma alteração no contrato aparece no mesmo commit que ajusta a
API e a tela — não existe janela em que as duas pontas divergem. Uma
instalação, um lint, uma esteira. Quem clona roda tudo com dois comandos.

**Contra.** O front carrega uma etapa de build do pacote de contratos antes de
subir; sem `pnpm build`, os testes e o `dev` falham reclamando de um `dist`
que ainda não existe. Está documentado no README e no CONTRIBUTING, e a
esteira compila antes de testar.

Publicar os pacotes separadamente continua possível: cada um já tem
`package.json`, `exports` e build próprios. A mudança seria de distribuição,
não de código.
