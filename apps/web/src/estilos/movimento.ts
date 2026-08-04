import type { CSSProperties } from 'react';

/**
 * Escalona a entrada dos elementos. A classe `.surgir` define a animação; o
 * atraso é o que transforma vários fades simultâneos em uma sequência.
 *
 * Quem pediu movimento reduzido no sistema não vê nada disso: `base.css`
 * zera duração e atraso nesse caso.
 */
export function atraso(milissegundos: number): CSSProperties {
  return { animationDelay: `${milissegundos}ms` };
}
