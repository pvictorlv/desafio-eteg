import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    /** Conexão com o Postgres efêmero desta execução. */
    urlDoBanco: string;
  }
}

// A mesma do docker-compose.yml: testar contra outra versão do Postgres é
// testar outro banco.
const IMAGEM = 'postgres:17-alpine';

const exigir = createRequire(import.meta.url);

let container: StartedPostgreSqlContainer | undefined;

/**
 * Sobe um Postgres de verdade para a suíte de integração.
 *
 * Um mock em memória não tem índice único, não tem chave estrangeira e não
 * devolve o `P2002` que o repositório traduz em `409` — ou seja, não testaria
 * justamente o que garante o cadastro único. O container é descartável e sobe
 * em segundos.
 */
export async function setup({ provide }: TestProject): Promise<void> {
  container = await new PostgreSqlContainer(IMAGEM).start();

  const urlDoBanco = container.getConnectionUri();

  // As migrações versionadas, não `db push`: o banco de teste é montado pelo
  // mesmo caminho que o de produção, então uma migração quebrada aparece aqui.
  rodarPrisma(['migrate', 'deploy'], urlDoBanco);
  rodarPrisma(['db', 'seed'], urlDoBanco);

  provide('urlDoBanco', urlDoBanco);
}

export async function teardown(): Promise<void> {
  await container?.stop();
}

/**
 * Chama o CLI do Prisma pelo arquivo de entrada em vez do executável do
 * `node_modules/.bin`: no Windows aquele é um `.cmd`, que `execFile` não sabe
 * rodar sem shell.
 */
function rodarPrisma(argumentos: readonly string[], urlDoBanco: string): void {
  execFileSync(process.execPath, [exigir.resolve('prisma/build/index.js'), ...argumentos], {
    env: { ...process.env, DATABASE_URL: urlDoBanco },
    stdio: 'inherit',
  });
}
