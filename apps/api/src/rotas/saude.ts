import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const esquemaSaude = z.object({
  status: z.enum(['ok', 'indisponivel']),
  banco: z.enum(['ok', 'indisponivel']).optional(),
});

/**
 * Dois healthchecks porque respondem perguntas diferentes:
 *
 * - /saude (liveness): o processo está vivo? Se falhar, reinicie o container.
 * - /saude/pronto (readiness): dá para mandar tráfego? Depende do banco.
 *
 * Juntar os dois faz o orquestrador reiniciar a aplicação quando quem caiu
 * foi o banco — reinício que não resolve nada e ainda derruba o que estava
 * de pé.
 */
export const rotasDeSaude: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/saude',
    {
      schema: {
        summary: 'Liveness: indica que o processo está no ar',
        tags: ['Saúde'],
        response: { 200: esquemaSaude },
      },
    },
    () => ({ status: 'ok' as const }),
  );

  app.get(
    '/saude/pronto',
    {
      schema: {
        summary: 'Readiness: indica que a aplicação consegue atender requisições',
        tags: ['Saúde'],
        response: { 200: esquemaSaude, 503: esquemaSaude },
      },
    },
    async (_requisicao, resposta) => {
      try {
        await app.banco.$queryRaw`SELECT 1`;
        return { status: 'ok' as const, banco: 'ok' as const };
      } catch (erro) {
        app.log.error({ erro }, 'Banco indisponível no readiness');
        return resposta.status(503).send({
          status: 'indisponivel' as const,
          banco: 'indisponivel' as const,
        });
      }
    },
  );
};
