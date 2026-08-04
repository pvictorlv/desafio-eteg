import { Component, type ErrorInfo, type ReactNode } from 'react';
import '../estilos/falha.css';
import { registrarErro } from '../infra/monitoramento';

interface PropsDoLimite {
  children: ReactNode;
  /** Versão reduzida, para quando o resto da página continua de pé. */
  compacto?: boolean;
}

interface EstadoDoLimite {
  falhou: boolean;
}

/**
 * Barreira contra erro de renderização.
 *
 * Sem ela, um `throw` em qualquer componente desmonta a árvore inteira e
 * quem estava preenchendo o formulário fica com uma página em branco — sem
 * mensagem, sem caminho de volta e sem ninguém sabendo que aconteceu.
 *
 * Precisa ser classe: `componentDidCatch` não tem equivalente em hook.
 */
export class LimiteDeErro extends Component<PropsDoLimite, EstadoDoLimite> {
  override state: EstadoDoLimite = { falhou: false };

  static getDerivedStateFromError(): EstadoDoLimite {
    return { falhou: true };
  }

  override componentDidCatch(erro: Error, informacao: ErrorInfo): void {
    registrarErro(erro, {
      origem: 'render',
      // A pilha de componentes diz onde quebrou sem carregar nenhum valor
      // digitado junto.
      componentes: informacao.componentStack ?? undefined,
    });
  }

  override render(): ReactNode {
    if (!this.state.falhou) {
      return this.props.children;
    }

    return (
      <div className="falha" role="alert" data-compacto={this.props.compacto ? '' : undefined}>
        <p className="etiqueta">Algo quebrou aqui</p>
        <h2 className="falha__titulo">Esta parte da página não carregou.</h2>
        <p className="falha__texto">
          O problema foi registrado. Recarregar costuma resolver; se insistir, tente de novo daqui a
          pouco.
        </p>
        <button
          type="button"
          className="botao"
          onClick={() => {
            window.location.reload();
          }}
        >
          Recarregar a página
        </button>
      </div>
    );
  }
}
