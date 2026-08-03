import { z } from 'zod';
import { normalizarCpf, validarCpf } from './cpf.js';

export const TAMANHO_MAXIMO_NOME = 120;
export const TAMANHO_MAXIMO_EMAIL = 160;
export const TAMANHO_MAXIMO_OBSERVACOES = 500;

/**
 * Contrato do cadastro. É usado como resolver do formulário e como schema de
 * validação da rota POST /api/clientes — uma regra só, dois consumidores.
 *
 * As transformações fazem parte do contrato: o que sai daqui já está
 * normalizado (CPF sem máscara, e-mail em minúsculas) e é isso que vai para o
 * banco. Assim a unicidade não depende de como o usuário digitou.
 */
export const esquemaCadastroCliente = z.object({
  nomeCompleto: z
    .string()
    .trim()
    .min(3, 'Informe o nome completo.')
    .max(TAMANHO_MAXIMO_NOME, `O nome deve ter no máximo ${TAMANHO_MAXIMO_NOME} caracteres.`)
    .refine((nome) => nome.split(/\s+/).length >= 2, 'Informe nome e sobrenome.'),

  cpf: z.string().transform(normalizarCpf).refine(validarCpf, 'CPF inválido.'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(TAMANHO_MAXIMO_EMAIL, `O e-mail deve ter no máximo ${TAMANHO_MAXIMO_EMAIL} caracteres.`)
    .pipe(z.email('E-mail inválido.')),

  corPreferidaId: z.uuid('Selecione uma cor.'),

  observacoes: z
    .string()
    .trim()
    .max(
      TAMANHO_MAXIMO_OBSERVACOES,
      `As observações devem ter no máximo ${TAMANHO_MAXIMO_OBSERVACOES} caracteres.`,
    )
    .optional()
    .transform((valor) => (valor && valor.length > 0 ? valor : undefined)),
});

/** O que o formulário manipula (CPF ainda com máscara, observações opcionais). */
export type EntradaCadastroCliente = z.input<typeof esquemaCadastroCliente>;

/** O que chega na camada de serviço, já normalizado. */
export type CadastroCliente = z.output<typeof esquemaCadastroCliente>;

export const esquemaClienteCriado = z.object({
  id: z.uuid(),
  criadoEm: z.iso.datetime(),
});

export type ClienteCriado = z.infer<typeof esquemaClienteCriado>;
