import { defineConfig, devices } from '@playwright/test';

const SEGUNDO = 1_000;

/**
 * Onde a aplicação já está no ar. Em desenvolvimento é o Vite, que faz proxy
 * de `/api`; na esteira é o container do compose, que serve as duas coisas na
 * mesma porta. O teste não sabe a diferença, e é esse o ponto.
 */
const URL_DA_APLICACAO = process.env['URL_DA_APLICACAO'] ?? 'http://localhost:5173';

const naEsteira = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'specs',
  timeout: 60 * SEGUNDO,
  expect: { timeout: 10 * SEGUNDO },

  // Um navegador por vez: o cadastro aceita cinco envios por minuto e por IP,
  // e paralelizar transformaria o limite num teste instável.
  workers: 1,
  fullyParallel: false,

  forbidOnly: naEsteira,
  retries: naEsteira ? 1 : 0,
  reporter: naEsteira ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: URL_DA_APLICACAO,
    // Só no que falhou: guardar o trace de tudo enche o artefato da esteira.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
