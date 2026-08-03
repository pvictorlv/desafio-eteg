import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Ambiente } from './config/ambiente.js';
import type { Banco } from './infra/banco.js';
import { pluginDeBanco } from './plugins/banco.js';
import { rotasDeSaude } from './rotas/saude.js';

export interface OpcoesDoServidor {
  ambiente: Ambiente;
  banco: Banco;
}

/**
 * Monta a aplicação sem subir servidor HTTP. Quem chama decide o que fazer
 * com ela: `main.ts` coloca para escutar uma porta, os testes usam
 * `app.inject()` e não precisam de porta nenhuma.
 */
export async function criarServidor({ ambiente, banco }: OpcoesDoServidor) {
  const app = Fastify({
    logger: {
      level: ambiente.NIVEL_DE_LOG,
      transport:
        ambiente.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined,
    },
    // Cadastro é um payload pequeno; aceitar megabytes só amplia a superfície
    // de ataque.
    bodyLimit: 32 * 1024,
  }).withTypeProvider<ZodTypeProvider>();

  // Faz o Fastify usar os esquemas Zod tanto para validar a entrada quanto
  // para serializar a saída — é o que dá tipagem de ponta a ponta nas rotas.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(pluginDeBanco, { banco });

  await app.register(rotasDeSaude);

  return app;
}

export type Servidor = Awaited<ReturnType<typeof criarServidor>>;
