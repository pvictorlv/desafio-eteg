import { CODIGOS_DE_ERRO, type Problema } from '@desafio-eteg/contratos';
import type { FastifyError, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { ErroDeNegocio } from '../servicos/erros.js';

/** Prefixo dos `type` do problem+json. Aponta para a documentação da API. */
const TIPO_BASE = 'https://github.com/pvictorlv/desafio-eteg/blob/main/docs/erros.md';

function responder(resposta: FastifyReply, problema: Problema): FastifyReply {
  return resposta.status(problema.status).type('application/problem+json').send(problema);
}

/**
 * Tradutor único de exceção para resposta HTTP, no formato problem+json
 * (RFC 9457).
 *
 * Concentrar isso aqui é o que permite as camadas de baixo lançarem erro de
 * domínio sem conhecer status code, e garante que nenhuma rota invente um
 * formato de erro diferente.
 */
export const pluginDeErros = fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async (app) => {
    app.setErrorHandler((erro: FastifyError, requisicao, resposta) => {
      // 1. Falha de validação do corpo: devolve campo a campo, para o
      //    formulário conseguir destacar cada um.
      if (hasZodFastifySchemaValidationErrors(erro)) {
        return responder(resposta, {
          type: `${TIPO_BASE}#dados-invalidos`,
          title: 'Dados inválidos',
          status: 422,
          detail: 'Revise os campos destacados e envie novamente.',
          codigo: CODIGOS_DE_ERRO.DADOS_INVALIDOS,
          erros: erro.validation.map((falha) => ({
            campo: falha.instancePath.replace(/^\//, '').replaceAll('/', '.'),
            mensagem: falha.message ?? 'Valor inválido.',
          })),
        });
      }

      // 2. Regra de negócio: o próprio erro sabe o status e o código.
      if (erro instanceof ErroDeNegocio) {
        return responder(resposta, {
          type: `${TIPO_BASE}#${erro.codigo.toLowerCase().replaceAll('_', '-')}`,
          title: erro.message,
          status: erro.status,
          detail: erro.message,
          codigo: erro.codigo,
          ...(erro.campo ? { campo: erro.campo } : {}),
        });
      }

      // 3. Erros do próprio Fastify (JSON malformado, 429 do rate limit,
      //    payload grande demais). São culpa do cliente, então não viram 500
      //    nem poluem o log de erro.
      const status = erro.statusCode ?? 500;

      if (status < 500) {
        return responder(resposta, {
          type: `${TIPO_BASE}#requisicao-invalida`,
          title: 'Requisição inválida',
          status,
          detail: erro.message,
          codigo: CODIGOS_DE_ERRO.DADOS_INVALIDOS,
        });
      }

      // 4. O que sobrou é bug nosso: registra com contexto e responde algo
      //    genérico — mensagem de exceção pode vazar detalhe de infra.
      requisicao.log.error(
        { erro, rota: `${requisicao.method} ${requisicao.url}` },
        'Erro não tratado',
      );

      return responder(resposta, {
        type: `${TIPO_BASE}#erro-interno`,
        title: 'Erro interno',
        status: 500,
        detail: 'Não foi possível concluir a operação. Tente novamente em instantes.',
        codigo: CODIGOS_DE_ERRO.ERRO_INTERNO,
      });
    });

    app.setNotFoundHandler((requisicao, resposta) =>
      responder(resposta, {
        type: `${TIPO_BASE}#rota-nao-encontrada`,
        title: 'Rota não encontrada',
        status: 404,
        detail: `Nada responde em ${requisicao.method} ${requisicao.url}.`,
        codigo: CODIGOS_DE_ERRO.DADOS_INVALIDOS,
      }),
    );
  },
  { name: 'erros' },
);
