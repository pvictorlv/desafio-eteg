import { z } from 'zod';

/**
 * Códigos estáveis de erro de negócio. Mudá-los é breaking change de contrato.
 *
 * O front usa o código para decidir se o `detail` da resposta pode aparecer na
 * tela: só os erros de negócio têm mensagem escrita para o usuário final. Em
 * qual campo destacar quem decide é o `campo`, logo abaixo.
 */
export const CODIGOS_DE_ERRO = {
  DADOS_INVALIDOS: 'DADOS_INVALIDOS',
  CPF_JA_CADASTRADO: 'CPF_JA_CADASTRADO',
  EMAIL_JA_CADASTRADO: 'EMAIL_JA_CADASTRADO',
  COR_NAO_ENCONTRADA: 'COR_NAO_ENCONTRADA',
  ERRO_INTERNO: 'ERRO_INTERNO',
} as const;

export type CodigoDeErro = (typeof CODIGOS_DE_ERRO)[keyof typeof CODIGOS_DE_ERRO];

/**
 * Resposta de erro no formato problem+json (RFC 9457), com dois campos extras
 * nossos: `codigo`, para o cliente reagir sem parsear texto, e `erros`, para
 * apontar falhas de validação campo a campo.
 */
export const esquemaProblema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  codigo: z.enum(CODIGOS_DE_ERRO),
  campo: z.string().optional(),
  erros: z
    .array(
      z.object({
        campo: z.string(),
        mensagem: z.string(),
      }),
    )
    .optional(),
});

export type Problema = z.infer<typeof esquemaProblema>;
