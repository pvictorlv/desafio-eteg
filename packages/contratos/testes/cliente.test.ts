import { describe, expect, it } from 'vitest';
import {
  esquemaCadastroCliente,
  TAMANHO_MAXIMO_NOME,
  TAMANHO_MAXIMO_OBSERVACOES,
} from '../src/cliente.js';

const CADASTRO_VALIDO = {
  nomeCompleto: 'Maria Aparecida de Souza',
  cpf: '529.982.247-25',
  email: 'maria@exemplo.com.br',
  corPreferidaId: '3f1d2c4e-8a6b-4f7c-9d0e-1a2b3c4d5e6f',
  observacoes: 'Prefere contato pela manhã.',
};

/** Erros do campo pedido, para afirmar sobre o que falhou e não sobre a ordem. */
function errosDe(entrada: unknown, campo: string): string[] {
  const resultado = esquemaCadastroCliente.safeParse(entrada);

  return resultado.success
    ? []
    : resultado.error.issues
        .filter((problema) => problema.path[0] === campo)
        .map((problema) => problema.message);
}

describe('esquemaCadastroCliente', () => {
  it('normaliza o cadastro válido antes de entregá-lo', () => {
    const resultado = esquemaCadastroCliente.parse({
      ...CADASTRO_VALIDO,
      nomeCompleto: '  Maria Aparecida de Souza  ',
      email: '  Maria@Exemplo.COM.BR ',
    });

    expect(resultado).toEqual({
      nomeCompleto: 'Maria Aparecida de Souza',
      // O que vai para o banco não tem máscara: é o que faz a unicidade parar
      // de depender de como a pessoa digitou.
      cpf: '52998224725',
      email: 'maria@exemplo.com.br',
      corPreferidaId: CADASTRO_VALIDO.corPreferidaId,
      observacoes: 'Prefere contato pela manhã.',
    });
  });

  describe('observações', () => {
    it.each([
      ['ausentes', undefined],
      ['vazias', ''],
      ['só com espaço', '   '],
    ])('trata observações %s como não informadas', (_caso, observacoes) => {
      const resultado = esquemaCadastroCliente.parse({ ...CADASTRO_VALIDO, observacoes });

      // `undefined` e não `''`: o repositório grava NULL, e uma coluna com
      // string vazia mente sobre ter conteúdo.
      expect(resultado.observacoes).toBeUndefined();
    });

    it('recusa observações acima do limite', () => {
      const entrada = {
        ...CADASTRO_VALIDO,
        observacoes: 'a'.repeat(TAMANHO_MAXIMO_OBSERVACOES + 1),
      };

      expect(errosDe(entrada, 'observacoes')).toHaveLength(1);
    });
  });

  describe('nome completo', () => {
    it('exige nome e sobrenome', () => {
      expect(errosDe({ ...CADASTRO_VALIDO, nomeCompleto: 'Maria' }, 'nomeCompleto')).toContain(
        'Informe nome e sobrenome.',
      );
    });

    it('recusa nome acima do limite', () => {
      const nomeCompleto = `${'a'.repeat(TAMANHO_MAXIMO_NOME)} sobrenome`;

      expect(errosDe({ ...CADASTRO_VALIDO, nomeCompleto }, 'nomeCompleto')).toHaveLength(1);
    });
  });

  describe('CPF', () => {
    it('recusa CPF com dígito verificador errado', () => {
      expect(errosDe({ ...CADASTRO_VALIDO, cpf: '529.982.247-24' }, 'cpf')).toContain(
        'CPF inválido.',
      );
    });

    it('aceita CPF sem máscara', () => {
      expect(esquemaCadastroCliente.parse({ ...CADASTRO_VALIDO, cpf: '52998224725' }).cpf).toBe(
        '52998224725',
      );
    });
  });

  describe('e-mail', () => {
    it.each(['maria', 'maria@', '@exemplo.com', 'maria exemplo.com'])(
      'recusa o e-mail %s',
      (email) => {
        expect(errosDe({ ...CADASTRO_VALIDO, email }, 'email')).toHaveLength(1);
      },
    );
  });

  describe('cor preferida', () => {
    it('exige um identificador em formato UUID', () => {
      expect(
        errosDe({ ...CADASTRO_VALIDO, corPreferidaId: 'vermelho' }, 'corPreferidaId'),
      ).toContain('Selecione uma cor.');
    });

    it('recusa quando nenhuma cor foi marcada', () => {
      expect(errosDe({ ...CADASTRO_VALIDO, corPreferidaId: '' }, 'corPreferidaId')).toHaveLength(1);
    });
  });
});
