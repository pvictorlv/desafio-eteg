import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Apelido para o client do Prisma. As camadas de cima dependem deste tipo, e
 * não do caminho do código gerado — se um dia trocarmos de ORM, o estrago
 * fica contido aqui e nos repositórios.
 */
export type Banco = PrismaClient;

/**
 * A partir da versão 7 o Prisma não embarca mais engine binária: a conexão
 * passa por um driver adapter. Na prática isso deixa a imagem Docker menor e
 * torna a URL um parâmetro explícito, o que ajuda nos testes.
 */
export function criarConexao(urlDoBanco: string): Banco {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: urlDoBanco }),
  });
}
