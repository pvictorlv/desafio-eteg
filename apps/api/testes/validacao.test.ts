import { CODIGOS_DE_ERRO, type Cor, type Problema } from '@desafio-eteg/contratos';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listarCores, montarAplicacao, type AplicacaoDeTeste } from './aplicacao.js';

const CADASTRO = {
  nomeCompleto: 'Maria Aparecida de Souza',
  cpf: '529.982.247-25',
  email: 'maria@exemplo.com.br',
};

describe('POST /api/clientes — entrada recusada', () => {
  let aplicacao: AplicacaoDeTeste;
  let corPreferidaId: string;

  beforeEach(async () => {
    aplicacao = await montarAplicacao();
    corPreferidaId = (await primeiraCor(aplicacao)).id;
  });

  afterEach(async () => {
    await aplicacao.encerrar();
  });

  function cadastrar(dados: Record<string, unknown>) {
    return aplicacao.app.inject({ method: 'POST', url: '/api/clientes', payload: dados });
  }

  /** Campos citados na lista `erros` do problem+json. */
  function camposCulpados(problema: Problema): string[] {
    return (problema.erros ?? []).map((falha) => falha.campo);
  }

  it('aponta cada campo inválido separadamente', async () => {
    const resposta = await cadastrar({
      nomeCompleto: 'Maria',
      cpf: '529.982.247-24',
      email: 'maria',
      corPreferidaId,
    });

    expect(resposta.statusCode).toBe(422);
    expect(resposta.headers['content-type']).toContain('application/problem+json');

    const problema = resposta.json<Problema>();

    expect(problema.codigo).toBe(CODIGOS_DE_ERRO.DADOS_INVALIDOS);
    // Um erro por campo, e não uma frase só: é o que permite o formulário
    // destacar os três de uma vez.
    expect(camposCulpados(problema)).toEqual(['nomeCompleto', 'cpf', 'email']);
  });

  it('recusa o cadastro sem cor escolhida', async () => {
    const resposta = await cadastrar(CADASTRO);

    expect(resposta.statusCode).toBe(422);
    expect(camposCulpados(resposta.json<Problema>())).toContain('corPreferidaId');
  });

  it('recusa observações acima do limite', async () => {
    const resposta = await cadastrar({
      ...CADASTRO,
      corPreferidaId,
      observacoes: 'a'.repeat(501),
    });

    expect(resposta.statusCode).toBe(422);
    expect(camposCulpados(resposta.json<Problema>())).toContain('observacoes');
  });

  it('recusa uma cor que não existe', async () => {
    const resposta = await cadastrar({ ...CADASTRO, corPreferidaId: randomUUID() });

    expect(resposta.statusCode).toBe(422);

    const problema = resposta.json<Problema>();

    expect(problema.codigo).toBe(CODIGOS_DE_ERRO.COR_NAO_ENCONTRADA);
    expect(problema.campo).toBe('corPreferidaId');
    expect(await aplicacao.banco.cliente.count()).toBe(0);
  });

  describe('cor fora de circulação', () => {
    let desativada: Cor;

    beforeEach(async () => {
      desativada = await primeiraCor(aplicacao);

      await aplicacao.banco.cor.update({ where: { id: desativada.id }, data: { ativa: false } });

      // Instância nova porque o serviço de cores guarda a lista em memória por
      // cinco minutos — a anterior ainda enxergaria a cor ativa.
      await aplicacao.encerrar();
      aplicacao = await montarAplicacao();
    });

    afterEach(async () => {
      await aplicacao.banco.cor.update({ where: { id: desativada.id }, data: { ativa: true } });
    });

    it('some da lista de cores disponíveis', async () => {
      const cores = await listarCores(aplicacao.app);

      expect(cores.map((cor) => cor.id)).not.toContain(desativada.id);
    });

    // A chave estrangeira não pegaria este caso: a linha continua na tabela.
    // Quem barra é a checagem no serviço, e é ela que este teste protege.
    it('recusa o cadastro que ainda a escolhe', async () => {
      const resposta = await cadastrar({ ...CADASTRO, corPreferidaId: desativada.id });

      expect(resposta.statusCode).toBe(422);
      expect(resposta.json<Problema>().codigo).toBe(CODIGOS_DE_ERRO.COR_NAO_ENCONTRADA);
    });
  });
});

async function primeiraCor(aplicacao: AplicacaoDeTeste): Promise<Cor> {
  const cores = await listarCores(aplicacao.app);
  const primeira = cores[0];

  if (!primeira) {
    throw new Error('O seed não deixou nenhuma cor disponível.');
  }

  return primeira;
}
