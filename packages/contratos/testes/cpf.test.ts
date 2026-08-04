import { describe, expect, it } from 'vitest';
import { formatarCpf, normalizarCpf, validarCpf } from '../src/cpf.js';

/** CPF com dígitos verificadores corretos. Não pertence a ninguém. */
const CPF_VALIDO = '52998224725';

describe('validarCpf', () => {
  it('aceita um CPF com os dois dígitos verificadores corretos', () => {
    expect(validarCpf(CPF_VALIDO)).toBe(true);
  });

  it('aceita o mesmo CPF com máscara', () => {
    expect(validarCpf('529.982.247-25')).toBe(true);
  });

  it('recusa quando o último dígito verificador não bate', () => {
    expect(validarCpf('52998224724')).toBe(false);
  });

  it('recusa quando o primeiro dígito verificador não bate', () => {
    expect(validarCpf('52998224735')).toBe(false);
  });

  // Passam no cálculo dos verificadores, e é justamente por isso que precisam
  // de uma regra própria.
  it.each(['00000000000', '11111111111', '99999999999'])('recusa a sequência %s', (sequencia) => {
    expect(validarCpf(sequencia)).toBe(false);
  });

  it('recusa quando faltam dígitos', () => {
    expect(validarCpf('5299822472')).toBe(false);
  });

  it('recusa quando sobram dígitos', () => {
    expect(validarCpf('529982247250')).toBe(false);
  });

  it('recusa texto sem nenhum dígito', () => {
    expect(validarCpf('não é um CPF')).toBe(false);
  });

  it('recusa string vazia', () => {
    expect(validarCpf('')).toBe(false);
  });
});

describe('normalizarCpf', () => {
  it('descarta a pontuação da máscara', () => {
    expect(normalizarCpf('529.982.247-25')).toBe(CPF_VALIDO);
  });

  it('devolve inalterado o que já vem só com dígitos', () => {
    expect(normalizarCpf(CPF_VALIDO)).toBe(CPF_VALIDO);
  });
});

describe('formatarCpf', () => {
  // A máscara acompanha a digitação, então precisa fazer sentido no meio do
  // caminho — e não só com os 11 dígitos na mão.
  it.each([
    ['5', '5'],
    ['529', '529'],
    ['5299', '529.9'],
    ['529982', '529.982'],
    ['5299822', '529.982.2'],
    ['529982247', '529.982.247'],
    ['5299822472', '529.982.247-2'],
    [CPF_VALIDO, '529.982.247-25'],
  ])('formata %s como %s', (digitado, esperado) => {
    expect(formatarCpf(digitado)).toBe(esperado);
  });

  it('ignora o que passa de onze dígitos', () => {
    expect(formatarCpf('52998224725999')).toBe('529.982.247-25');
  });

  it('reformata um valor que já vinha mascarado', () => {
    expect(formatarCpf('529.982.247-25')).toBe('529.982.247-25');
  });
});
