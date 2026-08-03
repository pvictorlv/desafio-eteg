import fp from 'fastify-plugin';
import type { Banco } from '../infra/banco.js';

declare module 'fastify' {
  interface FastifyInstance {
    banco: Banco;
  }
}

/**
 * Deixa a conexão disponível como `app.banco`. A conexão é criada fora e
 * injetada aqui: em teste passamos a do container efêmero sem tocar no código
 * de produção.
 */
export const pluginDeBanco = fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async (app, opcoes: { banco: Banco }) => {
    app.decorate('banco', opcoes.banco);

    app.addHook('onClose', async () => {
      await opcoes.banco.$disconnect();
    });
  },
  { name: 'banco' },
);
