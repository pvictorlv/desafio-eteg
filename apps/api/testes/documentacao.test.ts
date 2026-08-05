import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { montarAplicacao, type AplicacaoDeTeste } from './aplicacao.js';

interface Especificacao {
  openapi: string;
  paths: Record<string, Record<string, unknown>>;
}

describe('documentação da API', () => {
  let aplicacao: AplicacaoDeTeste;

  beforeEach(async () => {
    aplicacao = await montarAplicacao();
  });

  afterEach(async () => {
    await aplicacao.encerrar();
  });

  // O README manda a próxima equipe abrir /docs. Sem este teste, uma troca de
  // versão do swagger-ui derruba a página e o build segue verde.
  it('serve a página em /docs', async () => {
    const resposta = await aplicacao.app.inject({ method: 'GET', url: '/docs' });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.headers['content-type']).toContain('text/html');
  });

  it('descreve o cadastro na especificação, a partir dos esquemas Zod', async () => {
    const resposta = await aplicacao.app.inject({ method: 'GET', url: '/docs/json' });

    expect(resposta.statusCode).toBe(200);

    // A especificação sai do contrato, não de um arquivo à parte. Se a rota
    // sumir daqui, é sinal de que o transform parou de coletar os esquemas.
    const especificacao = resposta.json<Especificacao>();

    expect(especificacao.openapi).toMatch(/^3\./);
    expect(especificacao.paths['/api/clientes']).toHaveProperty('post');
    expect(especificacao.paths['/api/cores']).toHaveProperty('get');
  });
});
