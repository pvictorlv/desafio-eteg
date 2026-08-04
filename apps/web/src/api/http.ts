import { esquemaProblema, type Problema } from '@desafio-eteg/contratos';
import type { z } from 'zod';

/**
 * Caminho relativo de propósito. Em produção a API serve o próprio front, e
 * em desenvolvimento o proxy do Vite aponta para ela — nos dois casos o
 * navegador chama a mesma origem e não existe URL de API no bundle.
 */
const PREFIXO = '/api';

/** O servidor respondeu, mas com erro. `problema` traz o problem+json (RFC 9457). */
export class ErroDaApi extends Error {
  constructor(
    readonly status: number,
    readonly problema: Problema | null,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroDaApi';
  }
}

/** Não houve resposta: rede fora, servidor no chão, requisição cancelada. */
export class ErroDeConexao extends Error {
  constructor(causa: unknown) {
    super('Não foi possível falar com o servidor.', { cause: causa });
    this.name = 'ErroDeConexao';
  }
}

/**
 * A resposta chegou, mas não é o que o esquema descreve.
 *
 * Não é situação de usuário: é front e API divergindo do contrato, o que só
 * acontece quando um dos dois sobe sem o outro. Tem classe própria para o
 * monitoramento conseguir separá-la do ruído de rede — é o erro mais caro do
 * sistema e o que menos aparece sozinho.
 */
export class ErroDeContrato extends Error {
  constructor(caminho: string, detalhe: string) {
    super(`Resposta de ${caminho} fora do contrato: ${detalhe}`);
    this.name = 'ErroDeContrato';
  }
}

/**
 * Faz a requisição e valida a resposta contra o esquema compartilhado.
 *
 * Validar o que chega parece redundante — a API serializa a partir do mesmo
 * esquema — mas é o que garante que o tipo devolvido aqui descreve o dado de
 * verdade, e não uma promessa que o `fetch` não tem como cumprir.
 */
export async function requisitar<E extends z.ZodType>(
  caminho: string,
  esquema: E,
  opcoes?: RequestInit,
): Promise<z.output<E>> {
  let resposta: Response;

  try {
    resposta = await fetch(`${PREFIXO}${caminho}`, {
      ...opcoes,
      headers: { accept: 'application/json', ...opcoes?.headers },
    });
  } catch (causa) {
    throw new ErroDeConexao(causa);
  }

  const corpo = await lerCorpo(resposta);

  if (!resposta.ok) {
    const problema = esquemaProblema.safeParse(corpo);

    throw new ErroDaApi(
      resposta.status,
      problema.success ? problema.data : null,
      problema.success ? problema.data.title : `A requisição falhou (${resposta.status}).`,
    );
  }

  const dados = esquema.safeParse(corpo);

  if (!dados.success) {
    throw new ErroDeContrato(caminho, dados.error.message);
  }

  return dados.data;
}

/**
 * Um erro pode chegar sem corpo (429 do rate limit) ou com HTML de um proxy
 * no caminho. Nos dois casos a resposta ainda precisa virar um erro útil, em
 * vez de estourar no `JSON.parse`.
 */
async function lerCorpo(resposta: Response): Promise<unknown> {
  const texto = await resposta.text();

  if (texto.length === 0) {
    return null;
  }

  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return null;
  }
}
