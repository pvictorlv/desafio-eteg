import type { Cor } from '@desafio-eteg/contratos';
import type { Banco } from '../infra/banco.js';

export interface RepositorioDeCores {
  listarAtivas(): Promise<Cor[]>;
}

export function criarRepositorioDeCores(banco: Banco): RepositorioDeCores {
  return {
    listarAtivas() {
      return banco.cor.findMany({
        where: { ativa: true },
        orderBy: { ordem: 'asc' },
        // Projeção explícita: `ordem` e `ativa` são detalhe de armazenamento e
        // não fazem parte do contrato público.
        select: { id: true, slug: true, nome: true, hex: true },
      });
    },
  };
}
