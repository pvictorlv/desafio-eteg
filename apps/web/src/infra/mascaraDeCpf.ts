import { formatarCpf, normalizarCpf } from '@desafio-eteg/contratos';

/**
 * Reaplica a máscara preservando a posição do cursor.
 *
 * Reescrever `input.value` colapsa a seleção para o fim do texto. Digitando da
 * esquerda para a direita ninguém percebe, mas quem clica no meio para
 * corrigir um dígito vê o cursor pular para depois do último — e passa a
 * digitar no lugar errado. Apagar o `-` tinha o mesmo efeito: a máscara
 * recolocava o separador e o cursor sumia para a ponta.
 *
 * A âncora é a quantidade de dígitos à esquerda do cursor, não o índice do
 * caractere: só o dígito sobrevive à reformatação, o separador não.
 */
export function aplicarMascaraPreservandoCursor(campo: HTMLInputElement): void {
  const cursorOriginal = campo.selectionStart ?? campo.value.length;
  const digitosAntesDoCursor = normalizarCpf(campo.value.slice(0, cursorOriginal)).length;

  campo.value = formatarCpf(campo.value);

  const novoCursor = posicaoApos(campo.value, digitosAntesDoCursor);
  campo.setSelectionRange(novoCursor, novoCursor);
}

/** Índice logo depois do n-ésimo dígito do texto já mascarado. */
function posicaoApos(mascarado: string, quantidadeDeDigitos: number): number {
  if (quantidadeDeDigitos === 0) {
    return 0;
  }

  let vistos = 0;

  for (let indice = 0; indice < mascarado.length; indice += 1) {
    if (/\d/.test(mascarado[indice] ?? '')) {
      vistos += 1;

      if (vistos === quantidadeDeDigitos) {
        return indice + 1;
      }
    }
  }

  return mascarado.length;
}
