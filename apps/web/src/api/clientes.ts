import { esquemaClienteCriado, type CadastroCliente } from '@desafio-eteg/contratos';
import { useMutation } from '@tanstack/react-query';
import { requisitar } from './http';

/**
 * Envia o cadastro.
 *
 * O corpo é o `z.output` do esquema compartilhado — CPF já sem máscara e
 * e-mail em minúsculas —, que é exatamente o que a rota valida do outro lado.
 */
export function useCadastrarCliente() {
  return useMutation({
    mutationFn: (dados: CadastroCliente) =>
      requisitar('/clientes', esquemaClienteCriado, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dados),
      }),
  });
}
