import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

/** As cores que a API devolveria. Ids em UUID porque o contrato exige. */
export const CORES = [
  {
    id: '2c1f0f4e-1f1a-4b9a-9b1e-2f3a4b5c6d70',
    slug: 'vermelho',
    nome: 'Vermelho',
    hex: '#FF0000',
  },
  { id: '2c1f0f4e-1f1a-4b9a-9b1e-2f3a4b5c6d71', slug: 'azul', nome: 'Azul', hex: '#0057B8' },
];

export interface RespostaFalsa {
  status: number;
  corpo: unknown;
}

export const CADASTRO_ACEITO: RespostaFalsa = {
  status: 201,
  corpo: {
    id: '9a8b7c6d-5e4f-4a3b-9c8d-7e6f5a4b3c2d',
    criadoEm: '2026-08-05T18:30:00.000Z',
  },
};

export function cpfJaCadastrado(mensagem = 'Este CPF já está cadastrado.'): RespostaFalsa {
  return {
    status: 409,
    corpo: {
      type: 'https://exemplo/erros#cpf-ja-cadastrado',
      title: mensagem,
      status: 409,
      detail: mensagem,
      codigo: 'CPF_JA_CADASTRADO',
      campo: 'cpf',
    },
  };
}

/** O 429 do rate limit chega sem corpo em problem+json. */
export const EXCESSO_DE_ENVIOS: RespostaFalsa = { status: 429, corpo: null };

export interface ApiFalsa {
  /** Corpos recebidos em POST /api/clientes, na ordem em que chegaram. */
  cadastrosEnviados: Record<string, unknown>[];
  /** Troca a resposta do próximo cadastro. */
  responderCadastroCom: (resposta: RespostaFalsa) => void;
  /** Faz GET /api/cores falhar até que alguém peça de novo. */
  quebrarCores: (quebrada: boolean) => void;
  /** Faz o cadastro nem chegar ao servidor, como numa queda de rede. */
  derrubarConexao: (derrubada: boolean) => void;
  /**
   * Deixa o próximo cadastro pendurado e devolve a função que o solta. É o que
   * permite afirmar sobre o estado "Enviando…", que de outro modo passa rápido
   * demais para ser observado.
   */
  segurarCadastro: () => () => void;
}

/**
 * Substitui o `fetch` global em vez de dublar os hooks de consulta.
 *
 * O que se quer provar é o caminho inteiro — resolver do formulário, envio,
 * leitura do problem+json e reação da tela. Dublar `useCadastrarCliente`
 * apagaria justamente o trecho onde os erros aparecem.
 */
export function instalarApiFalsa(): ApiFalsa {
  const cadastrosEnviados: Record<string, unknown>[] = [];

  let respostaDoCadastro = CADASTRO_ACEITO;
  let coresQuebradas = false;
  let conexaoCaida = false;
  let cadastroSegurado: Promise<void> | null = null;

  vi.stubGlobal('fetch', (caminho: string, opcoes?: RequestInit) => {
    if (caminho === '/api/cores') {
      return Promise.resolve(
        coresQuebradas
          ? montar({ status: 503, corpo: { title: 'Serviço indisponível' } })
          : montar({ status: 200, corpo: CORES }),
      );
    }

    if (caminho === '/api/clientes') {
      // O envio sempre serializa o corpo antes de chamar; um corpo que não é
      // string aqui é sintoma de bug, não caso de teste.
      if (typeof opcoes?.body !== 'string') {
        throw new Error('O cadastro foi enviado sem corpo em JSON.');
      }

      cadastrosEnviados.push(JSON.parse(opcoes.body) as Record<string, unknown>);

      if (conexaoCaida) {
        // É assim que o `fetch` sinaliza rede fora: rejeita, não devolve
        // resposta de erro. É esse caminho que vira `ErroDeConexao`.
        return Promise.reject(new TypeError('Failed to fetch'));
      }

      return cadastroSegurado
        ? cadastroSegurado.then(() => montar(respostaDoCadastro))
        : Promise.resolve(montar(respostaDoCadastro));
    }

    throw new Error(`A tela chamou ${caminho}, que o teste não conhece.`);
  });

  return {
    cadastrosEnviados,
    responderCadastroCom: (resposta) => {
      respostaDoCadastro = resposta;
    },
    quebrarCores: (quebrada) => {
      coresQuebradas = quebrada;
    },
    derrubarConexao: (derrubada) => {
      conexaoCaida = derrubada;
    },
    segurarCadastro: () => {
      let liberar = () => undefined as void;

      cadastroSegurado = new Promise<void>((resolver) => {
        liberar = resolver;
      });

      return () => {
        cadastroSegurado = null;
        liberar();
      };
    },
  };
}

function montar({ status, corpo }: RespostaFalsa): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Um QueryClient por teste: o do aplicativo é um singleton de módulo e
 * carregaria o cache de um teste para o seguinte.
 */
export function renderizar(elemento: ReactElement): RenderResult {
  const clienteDeConsultas = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={clienteDeConsultas}>{elemento}</QueryClientProvider>);
}
