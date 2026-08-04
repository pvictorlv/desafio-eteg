import { carregarAmbiente } from './config/ambiente.js';
import { criarConexao } from './infra/banco.js';
import { iniciarMonitoramento } from './infra/monitoramento.js';
import { criarServidor } from './servidor.js';

const ambiente = carregarAmbiente();

// Antes de qualquer coisa: se a aplicação quebrar durante a montagem, é este
// o caminho que vai reportar.
const monitoramentoAtivo = iniciarMonitoramento(ambiente);

const banco = criarConexao(ambiente.DATABASE_URL);
const app = await criarServidor({ ambiente, banco });

app.log.info({ ambiente: ambiente.NODE_ENV, monitoramentoAtivo }, 'Aplicação montada');

/**
 * Encerramento gracioso: o orquestrador manda SIGTERM e espera. Sem isso, as
 * requisições em andamento morrem no meio a cada deploy.
 */
async function encerrar(sinal: NodeJS.Signals): Promise<void> {
  app.log.info({ sinal }, 'Encerrando a aplicação');

  try {
    await app.close();
    process.exit(0);
  } catch (erro) {
    app.log.error({ erro }, 'Falha ao encerrar');
    process.exit(1);
  }
}

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sinal, () => void encerrar(sinal));
}

try {
  // 0.0.0.0 e não localhost: dentro de um container, escutar só no loopback
  // torna a aplicação inalcançável de fora.
  await app.listen({ port: ambiente.PORT, host: '0.0.0.0' });
} catch (erro) {
  app.log.fatal({ erro }, 'Não foi possível iniciar o servidor');
  process.exit(1);
}
