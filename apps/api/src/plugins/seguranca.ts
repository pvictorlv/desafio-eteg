import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import type { Ambiente } from '../config/ambiente.js';

const LIMITE_GLOBAL_POR_MINUTO = 120;

export const pluginDeSeguranca = fp(
  async (app, { ambiente }: { ambiente: Ambiente }) => {
    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // O bundle do Vite injeta estilo inline; o Swagger UI injeta script
          // inline. Liberado só para a própria origem.
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    });

    // Lista vazia = nenhuma origem externa liberada. É o caso de produção,
    // onde a API serve o próprio front e tudo vem da mesma origem. Em
    // desenvolvimento o Vite roda em outra porta e precisa entrar na lista.
    await app.register(cors, {
      origin: ambiente.ORIGENS_PERMITIDAS.length > 0 ? ambiente.ORIGENS_PERMITIDAS : false,
      methods: ['GET', 'POST'],
    });

    // Formulário público sem autenticação é alvo fácil de robô. O limite por
    // rota, mais apertado, fica declarado na própria rota de cadastro.
    await app.register(rateLimit, {
      max: LIMITE_GLOBAL_POR_MINUTO,
      timeWindow: '1 minute',
    });
  },
  { name: 'seguranca' },
);
