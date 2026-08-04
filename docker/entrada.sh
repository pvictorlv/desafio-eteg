#!/bin/sh
# Prepara o banco e entrega o processo ao comando da imagem.
#
# Migrar no boot é a escolha certa para um PaaS de instância única, que é o
# cenário do enunciado: sobe o container e está pronto, sem passo manual. Com
# várias réplicas subindo juntas o desenho muda — ver docs/adr/0006-imagem-unica.md.
set -eu

echo "→ Aplicando migrações pendentes"
node_modules/.bin/prisma migrate deploy

echo "→ Garantindo as cores disponíveis"
node dist/comandos/popularCores.js

# `exec` para o processo do Node virar o PID 1 e receber o SIGTERM do
# orquestrador direto. Sem isso, quem recebe o sinal é este shell, e o
# encerramento gracioso da aplicação nunca acontece.
exec "$@"
