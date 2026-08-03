const TAMANHO_CPF = 11;
const TODOS_DIGITOS_IGUAIS = /^(\d)\1{10}$/;

/** Remove pontuação e mantém apenas os dígitos. É a forma como o CPF é persistido. */
export function normalizarCpf(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Aplica a máscara 000.000.000-00 progressivamente, para uso enquanto o
 * usuário digita — por isso não exige o CPF completo.
 */
export function formatarCpf(valor: string): string {
  return normalizarCpf(valor)
    .slice(0, TAMANHO_CPF)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

/**
 * Valida os dois dígitos verificadores.
 *
 * Não garante que o CPF exista na Receita Federal — para isso seria preciso
 * consultar um serviço externo. Aqui só descartamos o que é comprovadamente
 * inválido, que é o suficiente para o cadastro.
 */
export function validarCpf(valor: string): boolean {
  const somenteDigitos = normalizarCpf(valor);

  if (somenteDigitos.length !== TAMANHO_CPF) {
    return false;
  }

  // Sequências como 111.111.111-11 passam no cálculo mas nunca são válidas.
  if (TODOS_DIGITOS_IGUAIS.test(somenteDigitos)) {
    return false;
  }

  const digitos = Array.from(somenteDigitos, Number);

  return calcularDigitoVerificador(digitos, 9) === digitos[9] &&
    calcularDigitoVerificador(digitos, 10) === digitos[10];
}

function calcularDigitoVerificador(digitos: readonly number[], quantidade: number): number {
  const soma = digitos
    .slice(0, quantidade)
    .reduce((total, digito, posicao) => total + digito * (quantidade + 1 - posicao), 0);

  const resto = (soma * 10) % 11;

  return resto === 10 ? 0 : resto;
}
