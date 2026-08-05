import { CODIGOS_DE_ERRO, type Problema } from '@desafio-eteg/contratos';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { montarAplicacao, type AplicacaoDeTeste } from './aplicacao.js';

describe('rotas de infraestrutura', () => {
  let aplicacao: AplicacaoDeTeste;

  beforeEach(async () => {
    aplicacao = await montarAplicacao();
  });

  afterEach(async () => {
    await aplicacao.encerrar();
  });

  // É o endereço do HEALTHCHECK da imagem: se mudar de forma, o container
  // passa a reiniciar sozinho em produção.
  it('responde o liveness sem tocar no banco', async () => {
    const resposta = await aplicacao.app.inject({ method: 'GET', url: '/saude' });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toEqual({ status: 'ok' });
  });

  it('confirma no readiness que o banco responde', async () => {
    const resposta = await aplicacao.app.inject({ method: 'GET', url: '/saude/pronto' });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toEqual({ status: 'ok', banco: 'ok' });
  });

  it('devolve problem+json também para rota inexistente', async () => {
    const resposta = await aplicacao.app.inject({ method: 'GET', url: '/api/inexistente' });

    expect(resposta.statusCode).toBe(404);
    expect(resposta.headers['content-type']).toContain('application/problem+json');
    expect(resposta.json<Problema>().codigo).toBe(CODIGOS_DE_ERRO.DADOS_INVALIDOS);
  });

  it('devolve o x-request-id que veio na requisição', async () => {
    const resposta = await aplicacao.app.inject({
      method: 'GET',
      url: '/saude',
      headers: { 'x-request-id': 'rastreio-do-proxy' },
    });

    // Sem reaproveitar o id, o rastro para no balanceador e o relato de erro
    // do usuário não liga em nenhuma linha de log.
    expect(resposta.headers['x-request-id']).toBe('rastreio-do-proxy');
  });
});
