import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Ambiente } from './config/ambiente.js';
import type { Banco } from './infra/banco.js';
import { pluginDeBanco } from './plugins/banco.js';
import { pluginDeErros } from './plugins/erros.js';
import { criarRepositorioDeClientes } from './repositorios/clientes.js';
import { criarRepositorioDeCores } from './repositorios/cores.js';
import { rotasDeClientes } from './rotas/clientes.js';
import { rotasDeCores } from './rotas/cores.js';
import { rotasDeSaude } from './rotas/saude.js';
import { criarServicoDeClientes } from './servicos/clientes.js';
import { criarServicoDeCores } from './servicos/cores.js';

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

  await app.register(pluginDeErros);
  await app.register(pluginDeBanco, { banco });

  // Composition root: as dependências são montadas aqui e injetadas nas
  // rotas. Nenhuma camada instancia a de baixo por conta própria, o que
  // deixa qualquer uma substituível em teste.
  const servicoDeCores = criarServicoDeCores(criarRepositorioDeCores(banco));
  const servicoDeClientes = criarServicoDeClientes(
    criarRepositorioDeClientes(banco),
    servicoDeCores,
  );

  await app.register(rotasDeSaude);
  await app.register(rotasDeCores, { servicoDeCores });
  await app.register(rotasDeClientes, { servicoDeClientes });

  return app;
}

export type Servidor = Awaited<ReturnType<typeof criarServidor>>;
