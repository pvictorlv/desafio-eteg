import { CODIGOS_DE_ERRO, esquemaClienteCriado, type Problema } from '@desafio-eteg/contratos';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listarCores, montarAplicacao, type AplicacaoDeTeste } from './aplicacao.js';

/** CPFs com dígitos verificadores corretos. Não pertencem a ninguém. */
const CPF = '529.982.247-25';
const OUTRO_CPF = '111.444.777-35';

/** Seis distintos, para exercitar o limite de cinco envios por minuto. */
const CPFS_VALIDOS = [
  '529.982.247-25',
  '111.444.777-35',
  '123.456.789-09',
  '987.654.321-00',
  '045.123.456-12',
  '390.533.447-05',
];

const CADASTRO = {
  nomeCompleto: 'Maria Aparecida de Souza',
  cpf: CPF,
  email: 'maria@exemplo.com.br',
  observacoes: 'Prefere contato pela manhã.',
};

describe('POST /api/clientes', () => {
  let aplicacao: AplicacaoDeTeste;
  let corPreferidaId: string;

  beforeEach(async () => {
    aplicacao = await montarAplicacao();

    const cores = await listarCores(aplicacao.app);
    const primeira = cores[0];

    if (!primeira) {
      throw new Error('O seed não deixou nenhuma cor disponível.');
    }

    corPreferidaId = primeira.id;
  });

  afterEach(async () => {
    await aplicacao.encerrar();
  });

  function cadastrar(dados: Record<string, unknown>) {
    return aplicacao.app.inject({
      method: 'POST',
      url: '/api/clientes',
      payload: { ...dados, corPreferidaId },
    });
  }

  it('grava o cadastro e devolve o protocolo', async () => {
    const resposta = await cadastrar(CADASTRO);

    expect(resposta.statusCode).toBe(201);

    // Confere contra o esquema publicado, não contra o formato que a rota
    // devolve hoje: é o contrato que o front consome.
    const corpo = esquemaClienteCriado.safeParse(resposta.json());

    expect(corpo.success).toBe(true);
    expect(await aplicacao.banco.cliente.count()).toBe(1);
  });

  it('grava o CPF sem máscara e o e-mail em minúsculas', async () => {
    await cadastrar({ ...CADASTRO, email: 'MARIA@Exemplo.Com.BR' });

    const gravado = await aplicacao.banco.cliente.findFirstOrThrow();

    // A unicidade só vale se as duas pontas normalizarem igual: é o esquema
    // compartilhado que garante isso, e é o que este teste afirma.
    expect(gravado.cpf).toBe('52998224725');
    expect(gravado.email).toBe('maria@exemplo.com.br');
  });

  it('guarda observações em branco como nulo', async () => {
    await cadastrar({ ...CADASTRO, observacoes: '   ' });

    const gravado = await aplicacao.banco.cliente.findFirstOrThrow();

    expect(gravado.observacoes).toBeNull();
  });

  describe('cadastro único', () => {
    it('recusa o segundo cadastro do mesmo CPF', async () => {
      await cadastrar(CADASTRO);

      const repetido = await cadastrar({ ...CADASTRO, email: 'outra@exemplo.com.br' });

      expect(repetido.statusCode).toBe(409);
      expect(repetido.headers['content-type']).toContain('application/problem+json');

      const problema = repetido.json<Problema>();

      expect(problema.codigo).toBe(CODIGOS_DE_ERRO.CPF_JA_CADASTRADO);
      // É por este campo que o formulário decide o que destacar.
      expect(problema.campo).toBe('cpf');
    });

    it('reconhece o CPF repetido mesmo digitado sem máscara', async () => {
      await cadastrar({ ...CADASTRO, cpf: CPF });

      const repetido = await cadastrar({
        ...CADASTRO,
        cpf: '52998224725',
        email: 'outra@exemplo.com.br',
      });

      expect(repetido.statusCode).toBe(409);
      expect(repetido.json<Problema>().campo).toBe('cpf');
    });

    it('recusa o segundo cadastro do mesmo e-mail', async () => {
      await cadastrar(CADASTRO);

      const repetido = await cadastrar({ ...CADASTRO, cpf: OUTRO_CPF });

      expect(repetido.statusCode).toBe(409);

      const problema = repetido.json<Problema>();

      expect(problema.codigo).toBe(CODIGOS_DE_ERRO.EMAIL_JA_CADASTRADO);
      expect(problema.campo).toBe('email');
    });

    it('reconhece o e-mail repetido em caixa alta', async () => {
      await cadastrar(CADASTRO);

      const repetido = await cadastrar({
        ...CADASTRO,
        cpf: OUTRO_CPF,
        email: 'MARIA@EXEMPLO.COM.BR',
      });

      expect(repetido.statusCode).toBe(409);
      expect(repetido.json<Problema>().campo).toBe('email');
    });

    it('grava um único registro depois das tentativas repetidas', async () => {
      await cadastrar(CADASTRO);
      await cadastrar(CADASTRO);
      await cadastrar(CADASTRO);

      expect(await aplicacao.banco.cliente.count()).toBe(1);
    });

    it('grava uma vez só quando dois envios do mesmo CPF chegam juntos', async () => {
      const respostas = await Promise.all([cadastrar(CADASTRO), cadastrar(CADASTRO)]);
      const situacoes = respostas.map((resposta) => resposta.statusCode).sort();

      expect(situacoes).toEqual([201, 409]);
      expect(await aplicacao.banco.cliente.count()).toBe(1);
    });

    /**
     * Esta é a asserção que sustenta a ADR 0004, e ela é sobre o esquema de
     * propósito.
     *
     * O que a ADR promete é que a unicidade não tem janela de corrida — e isso
     * é propriedade do índice, não do código. Os testes acima, inclusive o de
     * envio simultâneo, passam também com um SELECT antes do INSERT: neste
     * ambiente as duas requisições acabam serializando no banco, e a corrida
     * não se reproduz sob demanda. Foi verificado trocando a implementação.
     *
     * Ou seja: teste de comportamento não distingue as duas implementações. O
     * que distingue é a constraint existir. Se alguém trocar o índice por uma
     * checagem na aplicação, é aqui que quebra.
     */
    it('mantém a unicidade como constraint do banco, e não como regra do código', async () => {
      const indices = await aplicacao.banco.$queryRaw<{ indexdef: string }[]>`
        SELECT indexdef FROM pg_indexes WHERE tablename = 'clientes'
      `;

      const unicos = indices
        .map((indice) => indice.indexdef)
        .filter((definicao) => definicao.includes('UNIQUE'));

      expect(unicos.some((definicao) => definicao.includes('(cpf)'))).toBe(true);
      expect(unicos.some((definicao) => definicao.includes('(email)'))).toBe(true);
    });
  });

  describe('limite de envios', () => {
    // Formulário público sem autenticação é alvo de robô. O limite é uma
    // configuração de uma linha na rota, fácil de sumir numa refatoração sem
    // que nada mais denuncie.
    it('recusa o sexto cadastro do mesmo cliente em um minuto', async () => {
      const enviados = [];

      for (let tentativa = 0; tentativa < 6; tentativa += 1) {
        enviados.push(
          await cadastrar({
            ...CADASTRO,
            cpf: CPFS_VALIDOS[tentativa],
            email: `${tentativa}@e.br`,
          }),
        );
      }

      expect(enviados.slice(0, 5).map((resposta) => resposta.statusCode)).toEqual([
        201, 201, 201, 201, 201,
      ]);

      const excedido = enviados[5];

      expect(excedido?.statusCode).toBe(429);
      // Sem `retry-after` o cliente não sabe quando voltar, e volta na hora.
      expect(excedido?.headers['retry-after']).toBeDefined();
    });
  });
});
