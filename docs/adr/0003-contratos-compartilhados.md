# 0003 — Um esquema Zod para as duas pontas

**Status:** aceita · 03/08/2026

## Contexto

O CPF precisa ser validado no formulário, para a pessoa saber do erro antes de
enviar, e no servidor, porque validação de cliente não é validação. O e-mail
precisa chegar em minúsculas nos dois lados, senão a unicidade passa a
depender de como alguém digitou.

Escrever a regra duas vezes é a forma clássica de as duas versões divergirem
em silêncio: um lado ganha um `trim`, o outro não, e o bug só aparece meses
depois num relatório de cadastro duplicado.

## Decisão

`packages/contratos` exporta os esquemas Zod, e eles são a única definição da
regra. A API os usa como `schema` da rota; o formulário, como `resolver` do
React Hook Form.

A **transformação faz parte do contrato**: `z.input` é o que o formulário
manipula (CPF ainda com máscara), `z.output` é o que trafega e o que vai para
o banco (CPF só com dígitos, e-mail em minúsculas). Os dois tipos saem do
mesmo esquema, então não há como o front mandar uma forma que o servidor não
espera.

Os códigos de erro moram no mesmo pacote. O front decide o que destacar pelo
`codigo` e pelo `campo` do problem+json, nunca pelo texto da mensagem —
melhorar a redação de um erro no servidor não pode quebrar a tela.

## Consequências

**A favor.** A validação não tem como divergir: mudar o esquema quebra o build
dos dois lados no mesmo commit. A documentação OpenAPI sai do mesmo lugar. Os
testes de contrato (`packages/contratos/testes`) cobrem a regra uma vez e
valem para os dois consumidores.

**Contra.** Os dois lados ficam presos ao Zod e à mesma versão dele. Um
cliente de outra linguagem não aproveita nada disso e teria que reimplementar
a regra a partir do OpenAPI publicado.

O front carrega o pacote no bundle, incluindo mensagens de erro em português
que também existem no servidor. São alguns kilobytes, e a alternativa era
duplicar a regra.
