import type { Cor } from '@desafio-eteg/contratos';
import { inject } from 'vitest';
import { carregarAmbiente } from '../src/config/ambiente.js';
import { criarConexao, type Banco } from '../src/infra/banco.js';
import { criarServidor, type Servidor } from '../src/servidor.js';

export interface AplicacaoDeTeste {
  app: Servidor;
  banco: Banco;
  encerrar: () => Promise<void>;
}

/**
 * Monta a aplicação inteira ligada ao Postgres efêmero.
 *
 * É a aplicação de produção: mesmas rotas, mesmos plugins, mesmo tradutor de
 * erro. Só a URL do banco muda — e ela já era parâmetro.
 *
 * Uma instância por teste, e não uma para o arquivo todo, porque o rate limit
 * e o cache de cores vivem na memória da instância. Compartilhá-las faria o
 * sexto cadastro do arquivo receber `429` sem ninguém ter pedido.
 */
export async function montarAplicacao(
  extras: Record<string, string> = {},
): Promise<AplicacaoDeTeste> {
  const urlDoBanco = inject('urlDoBanco');

  const ambiente = carregarAmbiente({
    NODE_ENV: 'test',
    DATABASE_URL: urlDoBanco,
    NIVEL_DE_LOG: 'fatal',
    ...extras,
  });

  const banco = criarConexao(urlDoBanco);
  const app = await criarServidor({ ambiente, banco });

  // O banco é compartilhado entre os arquivos; cada teste começa sem cadastro
  // nenhum para não depender de quem rodou antes.
  await banco.cliente.deleteMany();

  return {
    app,
    banco,
    // `app.close()` já derruba a conexão: o plugin de banco registra o
    // `$disconnect` no onClose.
    encerrar: () => app.close(),
  };
}

/** Lê as cores pela própria API, que é como o formulário as obtém. */
export async function listarCores(app: Servidor): Promise<Cor[]> {
  const resposta = await app.inject({ method: 'GET', url: '/api/cores' });

  return resposta.json<Cor[]>();
}
