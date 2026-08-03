import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

/**
 * Publica a especificação OpenAPI em /docs, gerada a partir dos mesmos
 * esquemas Zod que validam as rotas.
 *
 * Documentação escrita à mão descola do código na primeira semana. Derivada
 * do contrato, ou está certa ou o build quebra. Isso é o que a próxima equipe
 * abre primeiro.
 */
export const pluginDeDocumentacao = fp(
  async (app) => {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'API de cadastro de clientes',
          description:
            'Cadastro público de clientes. Cada CPF e cada e-mail podem ser cadastrados uma única vez.',
          version: '1.0.0',
        },
        tags: [
          { name: 'Clientes', description: 'Cadastro de clientes' },
          { name: 'Cores', description: 'Cores disponíveis para escolha' },
          { name: 'Saúde', description: 'Liveness e readiness' },
        ],
      },
      transform: jsonSchemaTransform,
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: true },
    });
  },
  { name: 'documentacao' },
);
