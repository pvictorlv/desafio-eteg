import type { Cor } from '@desafio-eteg/contratos';
import { atraso } from '../estilos/movimento';

/**
 * Coluna editorial da esquerda. Fica fixa enquanto o formulário rola e ecoa a
 * cor escolhida em tamanho grande.
 */
export function Abertura({ corEscolhida }: { corEscolhida: Cor | null }) {
  return (
    <header className="abertura">
      <p className="etiqueta surgir" style={atraso(0)}>
        Formulário público · cadastro único
      </p>

      <h1 className="abertura__titulo surgir" style={atraso(90)}>
        Sete cores,
        <br />
        um cadastro.
      </h1>

      <p className="abertura__resumo surgir" style={atraso(180)}>
        Nome, CPF, e-mail e a cor que você prefere. O CPF e o e-mail valem por uma inscrição só, e a
        confirmação aparece na mesma tela.
      </p>

      <EcoDaCor cor={corEscolhida} />
    </header>
  );
}

/**
 * Repete a cor escolhida em escala grande. Fica fora da árvore acessível de
 * propósito: quem usa leitor de tela já ouviu a escolha no próprio rádio.
 */
function EcoDaCor({ cor }: { cor: Cor | null }) {
  return (
    <figure className="eco surgir" aria-hidden="true" style={atraso(270)}>
      <span
        className="eco__amostra"
        data-vazia={cor === null ? '' : undefined}
        style={cor ? { backgroundColor: cor.hex } : undefined}
      />
      <figcaption className="eco__legenda">
        <span className="etiqueta">Cor preferida</span>
        {cor ? (
          <>
            <strong className="eco__nome">{cor.nome}</strong>
            <span className="eco__codigo">{cor.hex}</span>
          </>
        ) : (
          <span className="eco__nome eco__nome--vazio">ainda não escolhida</span>
        )}
      </figcaption>
    </figure>
  );
}
