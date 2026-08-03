import fp from 'fastify-plugin';
import { registrarExcecao } from '../infra/monitoramento.js';
import { ErroDeNegocio } from '../servicos/erros.js';

const CABECALHO_DE_CORRELACAO = 'x-request-id';

export const pluginDeObservabilidade = fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async (app) => {
    // Devolve o id da requisição para quem chamou. Sem isso, o usuário relata
    // "deu erro" e não há como ligar o relato a uma linha de log.
    app.addHook('onRequest', (requisicao, resposta, seguir) => {
      resposta.header(CABECALHO_DE_CORRELACAO, requisicao.id);
      seguir();
    });

    // Erro de negócio é fluxo esperado (CPF repetido, por exemplo) e não
    // deve gerar alerta. Só o que é bug nosso vai para o monitoramento.
    app.addHook('onError', (requisicao, _resposta, erro, seguir) => {
      if (!(erro instanceof ErroDeNegocio)) {
        registrarExcecao(erro, {
          requestId: requisicao.id,
          rota: `${requisicao.method} ${requisicao.url}`,
        });
      }

      seguir();
    });
  },
  { name: 'observabilidade' },
);
