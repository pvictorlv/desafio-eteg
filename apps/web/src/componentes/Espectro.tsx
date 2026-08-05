import type { Cor } from '@desafio-eteg/contratos';
import { atraso } from '../estilos/movimento';

const ATRASO_ENTRE_FAIXAS_MS = 70;

interface PropsDoEspectro {
  cores: readonly Cor[];
  idEmDestaque: string | null;
  carregando: boolean;
}

/**
 * Régua de cores no topo da página. Ao escolher uma cor no formulário, a
 * faixa correspondente cresce e as outras recuam.
 *
 * É decoração — daí o `aria-hidden` — porque a mesma informação já está no
 * grupo de rádios, e repeti-la faria o leitor de tela anunciar a escolha duas
 * vezes. O número de faixas vem da API: se a lista de cores mudar, a régua
 * muda junto.
 */
export function Espectro({ cores, idEmDestaque, carregando }: PropsDoEspectro) {
  // Lista vazia tem três causas — carregando, falhou, ou não há cor cadastrada.
  // A faixa pulsante só cabe na primeira: mantê-la nas outras seria dizer que
  // ainda vem coisa aí quando não vem. O erro em si é assunto do seletor, que
  // tem espaço para explicar e um botão para tentar de novo.
  if (cores.length === 0) {
    return (
      <div className="espectro" aria-hidden="true" data-carregando={carregando ? '' : undefined} />
    );
  }

  return (
    <div className="espectro" aria-hidden="true">
      {cores.map((cor, indice) => (
        <span
          key={cor.id}
          className="espectro__faixa surgir"
          data-estado={definirEstado(cor.id, idEmDestaque)}
          style={{ backgroundColor: cor.hex, ...atraso(indice * ATRASO_ENTRE_FAIXAS_MS) }}
        />
      ))}
    </div>
  );
}

function definirEstado(
  id: string,
  idEmDestaque: string | null,
): 'destacada' | 'apagada' | 'neutra' {
  if (idEmDestaque === null) {
    return 'neutra';
  }

  return id === idEmDestaque ? 'destacada' : 'apagada';
}
