import type { Cor } from '@desafio-eteg/contratos';
import type { RepositorioDeCores } from '../repositorios/cores.js';

const TTL_PADRAO_MS = 5 * 60 * 1000;

export interface ServicoDeCores {
  listar(): Promise<Cor[]>;
  existe(id: string): Promise<boolean>;
}

/**
 * Cache em memória para a lista de cores.
 *
 * É o caso clássico: dado pequeno, lido em todo carregamento do formulário e
 * que quase nunca muda. Sem cache, cada visita a uma tela estática vira uma
 * consulta ao banco.
 *
 * Limitação assumida: com várias instâncias, cada uma tem o seu cache, então
 * uma cor alterada pode levar até o TTL para aparecer em todas. Para esse
 * volume de mudança, 5 minutos de defasagem custam menos que a complexidade
 * de um cache distribuído.
 */
export function criarServicoDeCores(
  repositorio: RepositorioDeCores,
  ttlEmMs: number = TTL_PADRAO_MS,
): ServicoDeCores {
  let cache: { cores: Cor[]; expiraEm: number } | null = null;

  async function listar(): Promise<Cor[]> {
    const agora = Date.now();

    if (cache && cache.expiraEm > agora) {
      return cache.cores;
    }

    const cores = await repositorio.listarAtivas();
    cache = { cores, expiraEm: agora + ttlEmMs };

    return cores;
  }

  return {
    listar,

    /**
     * Reaproveita a lista em cache em vez de consultar o banco: é usado na
     * validação do cadastro, que acontece a cada envio do formulário.
     */
    async existe(id: string): Promise<boolean> {
      const cores = await listar();
      return cores.some((cor) => cor.id === id);
    },
  };
}
