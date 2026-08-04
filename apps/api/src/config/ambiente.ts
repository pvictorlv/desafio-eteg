import 'dotenv/config';
import { z } from 'zod';

const NIVEIS_DE_LOG = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

const esquemaAmbiente = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().int().positive().max(65535).default(3000),

  DATABASE_URL: z.url('Informe uma URL de conexão válida com o Postgres.'),

  /** Origens liberadas no CORS, separadas por vírgula. Vazio = mesma origem. */
  ORIGENS_PERMITIDAS: z
    .string()
    .default('')
    .transform((valor) =>
      valor
        .split(',')
        .map((origem) => origem.trim())
        .filter((origem) => origem.length > 0),
    ),

  NIVEL_DE_LOG: z.enum(NIVEIS_DE_LOG).default('info'),

  /** Opcional: se ausente, o envio de erros para o Sentry fica desligado. */
  SENTRY_DSN: z.string().optional(),
});

export type Ambiente = z.infer<typeof esquemaAmbiente>;

/**
 * Lê e valida a configuração uma única vez, no boot.
 *
 * A escolha é falhar rápido e ruidosamente: subir com `DATABASE_URL`
 * ausente só adia o erro para o primeiro request, quando já é tarde e o
 * healthcheck do orquestrador já marcou o container como saudável.
 */
export function carregarAmbiente(fonte: NodeJS.ProcessEnv = process.env): Ambiente {
  const resultado = esquemaAmbiente.safeParse(fonte);

  if (!resultado.success) {
    const detalhes = resultado.error.issues
      .map((problema) => `  - ${problema.path.join('.')}: ${problema.message}`)
      .join('\n');

    throw new Error(`Configuração de ambiente inválida:\n${detalhes}`);
  }

  return resultado.data;
}
