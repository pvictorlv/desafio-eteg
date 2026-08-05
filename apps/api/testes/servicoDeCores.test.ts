import type { Cor } from '@desafio-eteg/contratos';
import { describe, expect, it } from 'vitest';
import type { RepositorioDeCores } from '../src/repositorios/cores.js';
import { criarServicoDeCores } from '../src/servicos/cores.js';

const VERMELHO: Cor = {
  id: '2c1f0f4e-1f1a-4b9a-9b1e-2f3a4b5c6d70',
  slug: 'vermelho',
  nome: 'Vermelho',
  hex: '#FF0000',
};

/**
 * Mock de repositório que conta as consultas recebidas.
 *
 * É o único jeito de afirmar que o cache existe: contra o banco de verdade, a
 * resposta é idêntica com ou sem ele — o que se quer observar é a ida ao banco
 * que *não* aconteceu.
 */
function repositorioQueConta(): RepositorioDeCores & { consultas: () => number } {
  let consultas = 0;

  return {
    listarAtivas: () => {
      consultas += 1;
      return Promise.resolve([VERMELHO]);
    },
    consultas: () => consultas,
  };
}

describe('criarServicoDeCores', () => {
  const UM_MINUTO = 60_000;

  it('consulta o banco na primeira chamada', async () => {
    const repositorio = repositorioQueConta();
    const servico = criarServicoDeCores(repositorio, UM_MINUTO);

    expect(await servico.listar()).toEqual([VERMELHO]);
    expect(repositorio.consultas()).toBe(1);
  });

  it('reaproveita a lista dentro da validade', async () => {
    const repositorio = repositorioQueConta();
    const servico = criarServicoDeCores(repositorio, UM_MINUTO);

    await servico.listar();
    await servico.listar();
    await servico.listar();

    // Sem cache, cada carregamento do formulário viraria uma consulta a uma
    // tabela de sete linhas que quase nunca muda.
    expect(repositorio.consultas()).toBe(1);
  });

  it('consulta de novo depois que a validade expira', async () => {
    const repositorio = repositorioQueConta();
    // Validade zero: a lista já nasce vencida, e é o que torna a expiração
    // observável sem relógio falso nem espera.
    const servico = criarServicoDeCores(repositorio, 0);

    await servico.listar();
    await servico.listar();

    expect(repositorio.consultas()).toBe(2);
  });

  it('responde se uma cor existe sem ir ao banco de novo', async () => {
    const repositorio = repositorioQueConta();
    const servico = criarServicoDeCores(repositorio, UM_MINUTO);

    await servico.listar();

    expect(await servico.existe(VERMELHO.id)).toBe(true);
    expect(await servico.existe('4d2e1a5f-2b3c-4d5e-8f90-1a2b3c4d5e6f')).toBe(false);
    // A checagem roda a cada envio do formulário; ir ao banco nela anularia o
    // cache justamente no caminho mais quente.
    expect(repositorio.consultas()).toBe(1);
  });
});
