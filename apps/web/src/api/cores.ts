import { esquemaListaDeCores } from '@desafio-eteg/contratos';
import { useQuery } from '@tanstack/react-query';
import { requisitar } from './http';

export const CHAVE_DAS_CORES = ['cores'] as const;

/**
 * Lista as cores que o cliente pode escolher.
 *
 * A lista vem da API justamente porque o enunciado avisa que ela pode mudar.
 * Fixar as sete do arco-íris aqui faria o front mentir no dia em que alguém
 * acrescentasse a oitava.
 */
export function useCores() {
  return useQuery({
    queryKey: CHAVE_DAS_CORES,
    // O `signal` vem do TanStack Query e é o que cancela a requisição quando
    // o componente sai de cena ou alguém clica em "Tentar novamente" duas
    // vezes — sem ele ficam requisições órfãs correndo até o fim.
    queryFn: ({ signal }) => requisitar('/cores', esquemaListaDeCores, { signal }),
  });
}
