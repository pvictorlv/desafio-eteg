import type { Cor } from '@desafio-eteg/contratos';
import { useEffect, useRef } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

const CORES_NO_ESQUELETO = 7;

interface PropsDoSeletor {
  cores: readonly Cor[];
  carregando: boolean;
  falhou: boolean;
  aoTentarNovamente: () => void;
  /** Avisa quem está acima assim que a marcação muda. */
  aoMarcar: (id: string) => void;
  erro?: string | undefined;
  registro: UseFormRegisterReturn<'corPreferidaId'>;
}

/**
 * Grupo de rádios com as cores vindas da API.
 *
 * São rádios nativos porque a navegação por setas, o agrupamento e o
 * comportamento de "só um selecionado" já vêm prontos e corretos. O que se vê
 * é o `<span>` ao lado; o `<input>` fica invisível, mas focável.
 */
export function SeletorDeCor({
  cores,
  carregando,
  falhou,
  aoTentarNovamente,
  aoMarcar,
  erro,
  registro,
}: PropsDoSeletor) {
  const idDaLegenda = 'cores-legenda';
  const idDoErro = 'cores-erro';

  const primeiraCor = useRef<HTMLInputElement | null>(null);
  const pediuDeNovo = useRef(false);

  // Quem clicou em "Tentar novamente" está com o foco num botão que desaparece
  // assim que as cores chegam — e o foco cairia no body. Levá-lo para a
  // primeira cor entrega a pessoa exatamente onde ela parou.
  useEffect(() => {
    if (pediuDeNovo.current && !carregando && !falhou) {
      pediuDeNovo.current = false;
      primeiraCor.current?.focus();
    }
  }, [carregando, falhou]);

  return (
    <fieldset
      className="cores"
      role="radiogroup"
      aria-labelledby={idDaLegenda}
      aria-invalid={erro !== undefined}
      aria-describedby={erro ? idDoErro : undefined}
      aria-busy={carregando}
    >
      <legend className="etiqueta" id={idDaLegenda}>
        Cor preferida
      </legend>

      {falhou ? (
        <div className="cores__recuperacao" role="alert">
          <span>Não foi possível carregar as cores disponíveis.</span>
          <button
            type="button"
            className="botao botao--discreto"
            onClick={() => {
              pediuDeNovo.current = true;
              aoTentarNovamente();
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="cores__grade">
          {carregando
            ? [
                <span key="aviso" className="apenas-leitor-de-tela">
                  Carregando as cores disponíveis.
                </span>,
                ...Array.from({ length: CORES_NO_ESQUELETO }, (_, indice) => (
                  <span key={indice} className="cor__amostra cor__amostra--esqueleto" />
                )),
              ]
            : cores.map((cor, indice) => (
                <label className="cor" key={cor.id}>
                  <input
                    className="cor__entrada"
                    type="radio"
                    value={cor.id}
                    {...registro}
                    ref={(elemento) => {
                      registro.ref(elemento);

                      if (indice === 0) {
                        primeiraCor.current = elemento;
                      }
                    }}
                    onChange={(evento) => {
                      void registro.onChange(evento);
                      aoMarcar(cor.id);
                    }}
                    aria-invalid={erro !== undefined}
                    aria-describedby={erro ? idDoErro : undefined}
                  />
                  <span className="cor__amostra" style={{ backgroundColor: cor.hex }} />
                  <span className="cor__nome">{cor.nome}</span>
                </label>
              ))}
        </div>
      )}

      {erro ? (
        <p className="campo__erro" id={idDoErro} role="alert">
          {erro}
        </p>
      ) : null}
    </fieldset>
  );
}
