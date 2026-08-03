import { z } from 'zod';

/**
 * As cores vivem no banco, não em um enum. O enunciado avisa que a lista "pode
 * mudar posteriormente" — trocar isso não pode exigir deploy de código.
 */
export const esquemaCor = z.object({
  id: z.uuid(),
  slug: z.string(),
  nome: z.string(),
  hex: z.string(),
});

export const esquemaListaDeCores = z.array(esquemaCor);

export type Cor = z.infer<typeof esquemaCor>;
