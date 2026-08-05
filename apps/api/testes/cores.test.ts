import { esquemaListaDeCores } from '@desafio-eteg/contratos';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { montarAplicacao, type AplicacaoDeTeste } from './aplicacao.js';

const CORES_DO_ARCO_IRIS = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul', 'anil', 'violeta'];

describe('GET /api/cores', () => {
  let aplicacao: AplicacaoDeTeste;

  beforeEach(async () => {
    aplicacao = await montarAplicacao();
  });

  afterEach(async () => {
    await aplicacao.encerrar();
  });

  it('devolve as cores do seed na ordem do espectro', async () => {
    const resposta = await aplicacao.app.inject({ method: 'GET', url: '/api/cores' });

    expect(resposta.statusCode).toBe(200);

    const cores = esquemaListaDeCores.parse(resposta.json());

    expect(cores.map((cor) => cor.slug)).toEqual(CORES_DO_ARCO_IRIS);
  });

  it('não expõe os campos de armazenamento', async () => {
    const resposta = await aplicacao.app.inject({ method: 'GET', url: '/api/cores' });
    const [primeira] = esquemaListaDeCores.parse(resposta.json());

    // `ordem` e `ativa` são detalhe de como guardamos a lista. Vazá-los
    // convidaria o front a depender deles.
    expect(Object.keys(primeira ?? {}).sort()).toEqual(['hex', 'id', 'nome', 'slug']);
  });

  it('deixa o navegador guardar a lista por cinco minutos', async () => {
    const resposta = await aplicacao.app.inject({ method: 'GET', url: '/api/cores' });

    expect(resposta.headers['cache-control']).toBe('public, max-age=300');
  });
});
