import { defineConfig } from 'vitest/config';

const SEGUNDO = 1_000;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['testes/**/*.test.ts'],

    // Sobe um Postgres de verdade antes da suíte e derruba no fim.
    globalSetup: ['testes/postgresEfemero.ts'],

    // Baixar a imagem do Postgres na primeira execução passa dos 10s padrão,
    // e o `migrate deploy` vem logo atrás.
    hookTimeout: 180 * SEGUNDO,
    testTimeout: 30 * SEGUNDO,

    // Um banco só para todos os arquivos: rodar em paralelo faria a limpeza de
    // um arquivo apagar as linhas que outro acabou de gravar.
    fileParallelism: false,
  },
});
