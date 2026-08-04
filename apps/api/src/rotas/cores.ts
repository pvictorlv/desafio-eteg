import { esquemaListaDeCores } from '@desafio-eteg/contratos';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ServicoDeCores } from '../servicos/cores.js';

const SEGUNDOS_DE_CACHE_NO_NAVEGADOR = 300;

export const rotasDeCores: FastifyPluginAsyncZod<{ servicoDeCores: ServicoDeCores }> = async (
  app,
  { servicoDeCores },
) => {
  app.get(
    '/api/cores',
    {
      schema: {
        summary: 'Lista as cores disponíveis para escolha',
        description: 'As cores vêm do banco, não de um enum: a lista pode mudar sem exigir deploy.',
        tags: ['Cores'],
        response: { 200: esquemaListaDeCores },
      },
    },
    async (_requisicao, resposta) => {
      const cores = await servicoDeCores.listar();

      // Segura o request no navegador também, não só no servidor.
      resposta.header('cache-control', `public, max-age=${SEGUNDOS_DE_CACHE_NO_NAVEGADOR}`);

      return cores;
    },
  );
};
