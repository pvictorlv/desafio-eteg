import type { ReactNode } from 'react';

/** Atributos que o campo devolve para o controle que ele embrulha. */
export interface LigacaoDoCampo {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

interface PropsDoCampo {
  id: string;
  rotulo: string;
  erro?: string | undefined;
  dica?: string | undefined;
  /** Contador de caracteres, quando o campo tem limite visível. */
  medidor?: ReactNode;
  children: (ligacao: LigacaoDoCampo) => ReactNode;
}

/**
 * Rótulo, mensagem de erro e a ligação entre os dois.
 *
 * O controle é passado como função para receber os atributos ARIA já
 * calculados. É o que garante que `aria-describedby` sempre aponte para o
 * texto que existe naquele momento — repetir esse cálculo em cada campo é
 * exatamente como as duas pontas desencontram.
 */
export function Campo({ id, rotulo, erro, dica, medidor, children }: PropsDoCampo) {
  const idDoErro = `${id}-erro`;
  const idDaDica = `${id}-dica`;

  const descricoes = [erro ? idDoErro : null, dica ? idDaDica : null].filter(
    (valor) => valor !== null,
  );

  return (
    <div className="campo">
      <div className="campo__rotulo">
        <label className="etiqueta" htmlFor={id}>
          {rotulo}
        </label>
        {medidor}
      </div>

      {children({
        id,
        'aria-invalid': erro !== undefined,
        'aria-describedby': descricoes.length > 0 ? descricoes.join(' ') : undefined,
      })}

      {dica ? (
        <p className="campo__dica" id={idDaDica}>
          {dica}
        </p>
      ) : null}

      {/* `role="alert"` faz o leitor de tela anunciar a mensagem assim que ela
          aparece, sem esperar o foco voltar ao campo.

          Aqui é alerta *e* foco, ao contrário do `AvisoDeErro`, que é foco em
          vez de alerta. A diferença é deliberada: o aviso geral é sempre único
          e sempre recebe o foco, então o alerta só duplicaria o anúncio. Num
          envio inválido, ao contrário, vários campos erram de uma vez e só o
          primeiro recebe o foco — sem o alerta, o erro dos outros ficaria mudo
          até a pessoa tabular até lá. O preço é o primeiro campo ser anunciado
          duas vezes; o silêncio nos demais é o erro mais caro. */}
      {erro ? (
        <p className="campo__erro" id={idDoErro} role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
