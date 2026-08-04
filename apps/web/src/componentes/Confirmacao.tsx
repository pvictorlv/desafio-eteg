import type { ClienteCriado, Cor } from '@desafio-eteg/contratos';
import { useEffect, useRef, type ReactNode } from 'react';
import '../estilos/confirmacao.css';
import { atraso } from '../estilos/movimento';

const FORMATO_DE_DATA = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeStyle: 'short',
});

interface PropsDaConfirmacao {
  cliente: ClienteCriado;
  nomeCompleto: string;
  cor: Cor | null;
}

/**
 * Substitui o formulário depois do cadastro.
 *
 * Substituir em vez de mostrar um aviso acima é o que responde à exigência do
 * enunciado — "ao clicar em enviar, o mesmo deve saber se o cadastro foi bem
 * sucedido" — sem deixar na tela um formulário preenchido que convida a
 * enviar de novo.
 */
export function Confirmacao({ cliente, nomeCompleto, cor }: PropsDaConfirmacao) {
  const titulo = useRef<HTMLHeadingElement>(null);

  // O formulário saiu da tela e levou o foco junto. Sem isto o foco volta para
  // o começo do documento e quem usa leitor de tela não ouve a confirmação.
  useEffect(() => {
    titulo.current?.focus();
  }, []);

  return (
    <section className="confirmacao" aria-labelledby="confirmacao-titulo">
      <p className="etiqueta surgir" style={atraso(0)}>
        Cadastro concluído
      </p>

      <h2
        className="confirmacao__titulo surgir"
        id="confirmacao-titulo"
        ref={titulo}
        tabIndex={-1}
        style={atraso(80)}
      >
        Tudo certo, {primeiroNome(nomeCompleto)}.
      </h2>

      <p className="confirmacao__texto surgir" style={atraso(160)}>
        Seus dados foram gravados. Guarde o número abaixo caso precise falar com a gente sobre este
        cadastro.
      </p>

      <dl className="confirmacao__ficha surgir" style={atraso(240)}>
        <Linha termo="Protocolo">
          <span className="confirmacao__protocolo">{cliente.id}</span>
        </Linha>

        <Linha termo="Registrado em">{FORMATO_DE_DATA.format(new Date(cliente.criadoEm))}</Linha>

        {cor ? (
          <Linha termo="Cor preferida">
            <span className="confirmacao__cor">
              <span className="confirmacao__amostra" style={{ backgroundColor: cor.hex }} />
              {cor.nome}
            </span>
          </Linha>
        ) : null}
      </dl>

      <p className="confirmacao__nota surgir" style={atraso(320)}>
        Este CPF e este e-mail já não podem ser cadastrados de novo.
      </p>
    </section>
  );
}

/** Linha de ficha, com o pontilhado ligando o termo ao valor. */
function Linha({ termo, children }: { termo: string; children: ReactNode }) {
  return (
    <div className="confirmacao__linha">
      <dt>{termo}</dt>
      <span className="confirmacao__pontilhado" aria-hidden="true" />
      <dd>{children}</dd>
    </div>
  );
}

function primeiroNome(nomeCompleto: string): string {
  return nomeCompleto.split(/\s+/)[0] ?? nomeCompleto;
}
