import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Ambiente } from './config/ambiente.js';
import type { Banco } from './infra/banco.js';
import { pluginDeBanco } from './plugins/banco.js';
import { pluginDeDocumentacao } from './plugins/documentacao.js';
import { pluginDeErros } from './plugins/erros.js';
import { pluginDeObservabilidade } from './plugins/observabilidade.js';
import { pluginDeSeguranca } from './plugins/seguranca.js';
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
      // Nome completo, CPF e e-mail são dados pessoais (LGPD). Log costuma
      // sair da máquina — vai para agregador, backup, ticket de suporte — e
      // uma vez lá, some com dificuldade. Redação na origem é mais barata
      // que política de retenção.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          '*.cpf',
          '*.email',
          '*.nomeCompleto',
          '*.observacoes',
        ],
        censor: '[oculto]',
      },
      transport:
        ambiente.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            }
          : undefined,
    },
    // Reaproveita o id que o proxy já criou, quando existir: é o que permite
    // seguir uma requisição do balanceador até a linha de log da aplicação.
    genReqId: (requisicao) => {
      const informado = requisicao.headers['x-request-id'];
      return typeof informado === 'string' && informado.length > 0 ? informado : randomUUID();
    },
    // Cadastro é um payload pequeno; aceitar megabytes só amplia a superfície
    // de ataque.
    bodyLimit: 32 * 1024,
    // Só confia em X-Forwarded-For onde de fato existe um proxy na frente.
    // Confiar sempre permitiria forjar o IP e furar o rate limit.
    trustProxy: ambiente.NODE_ENV === 'production',
  }).withTypeProvider<ZodTypeProvider>();

  // Faz o Fastify usar os esquemas Zod tanto para validar a entrada quanto
  // para serializar a saída — é o que dá tipagem de ponta a ponta nas rotas.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(pluginDeObservabilidade);
  await app.register(pluginDeErros);
  await app.register(pluginDeSeguranca, { ambiente });
  await app.register(pluginDeBanco, { banco });

  // Precisa vir antes das rotas: é registrando-se primeiro que o swagger
  // consegue coletar os esquemas de cada uma.
  await app.register(pluginDeDocumentacao);

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
