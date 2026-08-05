import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ehFalhaEsperada, registrarErro } from '../infra/monitoramento';
import { ErroDaApi, ErroDeContrato } from './http';

const TENTATIVAS_DE_LEITURA = 2;

/** Mesma janela do `cache-control` que a API manda em GET /api/cores. */
const TEMPO_ATE_ENVELHECER_MS = 5 * 60 * 1000;

/**
 * Sem isto o TanStack Query guarda o erro no estado e pronto: a tela mostra a
 * mensagem, o usuário segue a vida e ninguém nunca fica sabendo. Registrar no
 * cache pega os dois caminhos — consulta e envio — de uma vez.
 */
function registrarSeInesperado(erro: unknown, operacao: string): void {
  if (!ehFalhaEsperada(erro)) {
    registrarErro(erro, { origem: operacao });
  }
}

const clienteDeConsultas = new QueryClient({
  queryCache: new QueryCache({
    onError: (erro) => {
      registrarSeInesperado(erro, 'consulta');
    },
  }),
  mutationCache: new MutationCache({
    onError: (erro) => {
      registrarSeInesperado(erro, 'envio');
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: TEMPO_ATE_ENVELHECER_MS,
      refetchOnWindowFocus: false,
      // Repetir um 4xx só gasta o rate limit da API: a resposta não vai mudar.
      // Resposta fora do contrato também não muda sozinha — repeti-la só
      // triplicaria o ruído no monitoramento. Falha de rede, essa sim,
      // costuma passar na segunda tentativa.
      retry: (tentativas, erro) =>
        !(erro instanceof ErroDaApi) &&
        !(erro instanceof ErroDeContrato) &&
        tentativas < TENTATIVAS_DE_LEITURA,
    },
    mutations: {
      // O cadastro não é idempotente. Uma repetição automática depois de um
      // timeout pode gravar duas vezes, ou devolver um 409 confuso para quem
      // preencheu certo.
      retry: false,
    },
  },
});

export function ProvedorDeDados({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={clienteDeConsultas}>{children}</QueryClientProvider>;
}
