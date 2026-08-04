import { useEffect, useRef } from 'react';

const ID_DO_TITULO = 'aviso-titulo';

/**
 * Aviso para a falha que não pertence a nenhum campo — servidor fora do ar,
 * limite de envios, erro interno.
 *
 * Recebe o foco ao aparecer porque, nesse caso, não há campo inválido para
 * onde mandar a pessoa: sem isso o foco continuaria no botão de enviar e a
 * explicação ficaria em algum lugar acima, fora da tela.
 *
 * E é foco *em vez* de `role="alert"`, não os dois. Mover o foco para dentro
 * de uma região assertiva no instante em que ela é anunciada faz o leitor de
 * tela repetir ou cortar a mensagem; o próprio foco já garante a leitura.
 */
export function AvisoDeErro({ mensagem }: { mensagem: string }) {
  const referencia = useRef<HTMLDivElement>(null);

  useEffect(() => {
    referencia.current?.focus();
    referencia.current?.scrollIntoView({ block: 'nearest' });
  }, [mensagem]);

  return (
    <div
      className="aviso"
      role="group"
      aria-labelledby={ID_DO_TITULO}
      tabIndex={-1}
      ref={referencia}
    >
      <strong className="aviso__titulo" id={ID_DO_TITULO}>
        Não foi possível concluir o cadastro
      </strong>
      <span>{mensagem}</span>
    </div>
  );
}
