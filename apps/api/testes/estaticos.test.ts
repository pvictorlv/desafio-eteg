import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { montarAplicacao, type AplicacaoDeTeste } from './aplicacao.js';

const CASCA = '<!doctype html><title>Cadastro</title><div id="raiz"></div>';
const BUNDLE = 'console.log("cadastro");';

describe('SPA servida pela própria API', () => {
  let diretorio: string;
  let aplicacao: AplicacaoDeTeste;

  // Um dist mínimo, montado à mão: o que se testa é o roteamento, não o
  // bundle do Vite.
  beforeAll(async () => {
    diretorio = await mkdtemp(join(tmpdir(), 'front-'));

    await writeFile(join(diretorio, 'index.html'), CASCA);
    await writeFile(join(diretorio, 'app-a1b2c3.js'), BUNDLE);
  });

  afterAll(async () => {
    await rm(diretorio, { recursive: true, force: true });
  });

  beforeEach(async () => {
    aplicacao = await montarAplicacao({ DIRETORIO_DO_FRONT: diretorio });
  });

  afterEach(async () => {
    await aplicacao.encerrar();
  });

  function pedir(url: string) {
    return aplicacao.app.inject({ method: 'GET', url });
  }

  it('entrega a casca da SPA na raiz', async () => {
    const resposta = await pedir('/');

    expect(resposta.statusCode).toBe(200);
    expect(resposta.body).toContain('id="raiz"');
  });

  // Abrir uma URL interna direto, ou dar F5 nela, tem que funcionar: o
  // roteamento é do navegador, e o servidor não conhece esses caminhos.
  it('entrega a casca da SPA em qualquer caminho do front', async () => {
    const resposta = await pedir('/cadastro/confirmado');

    expect(resposta.statusCode).toBe(200);
    expect(resposta.body).toContain('id="raiz"');
  });

  it('entrega os arquivos do bundle', async () => {
    const resposta = await pedir('/app-a1b2c3.js');

    expect(resposta.statusCode).toBe(200);
    expect(resposta.body).toBe(BUNDLE);
  });

  it('guarda o bundle para sempre e a casca nunca', async () => {
    // O nome do bundle carrega o hash do conteúdo; o do index.html não.
    expect((await pedir('/app-a1b2c3.js')).headers['cache-control']).toContain('immutable');
    expect((await pedir('/')).headers['cache-control']).toBe('no-cache');
  });

  it('continua respondendo a API em vez da casca', async () => {
    const resposta = await pedir('/api/cores');

    expect(resposta.statusCode).toBe(200);
    expect(resposta.headers['content-type']).toContain('application/json');
  });

  // Quem chama a API espera problem+json. Devolver a página de índice faria o
  // cliente engasgar num HTML onde procurava um `codigo`.
  it('responde 404 em problem+json para rota de API inexistente', async () => {
    const resposta = await pedir('/api/inexistente');

    expect(resposta.statusCode).toBe(404);
    expect(resposta.headers['content-type']).toContain('application/problem+json');
  });
});
