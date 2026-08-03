import {
  esquemaCadastroCliente,
  esquemaClienteCriado,
  esquemaProblema,
} from '@desafio-eteg/contratos';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ServicoDeClientes } from '../servicos/clientes.js';

export const rotasDeClientes: FastifyPluginAsyncZod<{
  servicoDeClientes: ServicoDeClientes;
}> = async (app, { servicoDeClientes }) => {
  app.post(
    '/api/clientes',
    {
      schema: {
        summary: 'Cadastra um cliente',
        description:
          'Cada CPF e cada e-mail podem ser cadastrados uma única vez. Uma segunda tentativa responde 409.',
        tags: ['Clientes'],
        body: esquemaCadastroCliente,
        response: {
          201: esquemaClienteCriado,
          409: esquemaProblema,
          422: esquemaProblema,
        },
      },
    },
    async (requisicao, resposta) => {
      // requisicao.body já chega validado e normalizado pelo esquema
      // compartilhado — a rota não repete nenhuma regra.
      const cliente = await servicoDeClientes.cadastrar(requisicao.body);

      return resposta.status(201).send(cliente);
    },
  );
};
