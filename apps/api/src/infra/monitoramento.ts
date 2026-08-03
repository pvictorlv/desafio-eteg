import * as Sentry from '@sentry/node';
import type { Ambiente } from '../config/ambiente.js';

let ligado = false;

/**
 * Liga o envio de exceções para o Sentry, se houver DSN configurada.
 *
 * Precisa ser chamado antes de montar a aplicação: é assim que a
 * instrumentação automática do SDK consegue se enganchar nas bibliotecas.
 * Sem DSN o projeto roda normalmente — log estruturado continua sendo o
 * mínimo garantido.
 */
export function iniciarMonitoramento(ambiente: Ambiente): boolean {
  if (!ambiente.SENTRY_DSN) {
    return false;
  }

  Sentry.init({
    dsn: ambiente.SENTRY_DSN,
    environment: ambiente.NODE_ENV,
    // Só erro. Tracing custa volume e não há pergunta de performance em
    // aberto que justifique isso agora.
    tracesSampleRate: 0,
    // Impede que o SDK leve corpo de requisição junto: é onde estão o CPF e
    // o e-mail.
    sendDefaultPii: false,
  });

  ligado = true;

  return true;
}

export function registrarExcecao(erro: unknown, contexto: Record<string, unknown> = {}): void {
  if (!ligado) {
    return;
  }

  Sentry.captureException(erro, { extra: contexto });
}
