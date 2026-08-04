# 0007 — Dado pessoal não entra em log

**Status:** aceita · 03/08/2026

## Contexto

O formulário coleta nome completo, CPF e e-mail. CPF é dado pessoal pela LGPD,
e os três juntos identificam alguém sem esforço nenhum.

Log não fica na máquina. Vai para agregador, entra em backup, é colado em
ticket de suporte, aparece em captura de tela de incidente. Depois que vazou,
não volta — e a resposta usual, "a gente configura retenção depois", só troca
o problema de lugar: o dado já saiu.

## Decisão

Redigir na origem, em vez de filtrar no destino.

O logger da API tem `redact` para `*.cpf`, `*.email`, `*.nomeCompleto`,
`*.observacoes`, `authorization` e `cookie`. O corpo da requisição nunca é
logado inteiro. No front, `infra/monitoramento.ts` é o funil único de erro, e
o tipo `Contexto` aceita só valores primitivos — passar `{ dados }` com o
formulário inteiro não compila.

O que sobra no log é o `x-request-id`, o método, a rota e o status. É o
suficiente para investigar: a pessoa relata o problema com o id que a resposta
devolveu, e a linha correspondente aparece na busca.

Erro de negócio — CPF repetido, campo inválido — não vai para o monitoramento.
É fluxo esperado, a tela já explica, e alertar sobre ele afogaria o que
importa.

## Consequências

**A favor.** Um vazamento de log não vira incidente de dados pessoais. A regra
mora em dois lugares nomeados, então revisar é olhar dois arquivos. O
`x-request-id` é reaproveitado quando o proxy já mandou um, o que liga a linha
do balanceador à da aplicação.

**Contra.** Depurar exige mais trabalho: o log diz que o cadastro falhou, não
qual CPF. É a troca escolhida — quando fizer falta de verdade, o caminho é
consultar o banco com o id da requisição em mãos, com o acesso auditado, e não
soltar o dado no log de todo mundo.

Os caminhos de `redact` são texto e não são conferidos pelo compilador.
Renomear `nomeCompleto` no esquema sem ajustar o logger deixaria o campo
passar. Está listado no checklist de pull request.
