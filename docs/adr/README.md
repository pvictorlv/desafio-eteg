# Decisões de arquitetura

Cada arquivo aqui registra uma decisão: o que estava em jogo, o que foi
escolhido e o que se paga por isso. São curtos de propósito — o valor está em
existir uma resposta escrita para "por que isto é assim", não em cobrir tudo.

O enunciado avisa que o projeto continua com outra equipe. Estas páginas são o
que a próxima pessoa lê antes de mudar algo e descobrir sozinha o motivo.

| #                                        | Decisão                            |
| ---------------------------------------- | ---------------------------------- |
| [0001](0001-monorepo-pnpm.md)            | Monorepo com pnpm workspaces       |
| [0002](0002-fastify-e-prisma.md)         | Fastify e Prisma na API            |
| [0003](0003-contratos-compartilhados.md) | Um esquema Zod para as duas pontas |
| [0004](0004-unicidade-no-banco.md)       | Unicidade garantida pelo índice    |
| [0005](0005-cores-como-dado.md)          | Cores no banco, não em enum        |
| [0006](0006-imagem-unica.md)             | Imagem única e migrações no boot   |
| [0007](0007-pii-e-logs.md)               | Dado pessoal não entra em log      |

Uma decisão revista não é apagada: ganha um arquivo novo que a substitui, e o
antigo passa a `Substituída`. O histórico é parte do valor.
