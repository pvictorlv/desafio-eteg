import { CODIGOS_DE_ERRO, type CodigoDeErro } from '@desafio-eteg/contratos';

/**
 * Erro previsto de regra de negócio.
 *
 * Carrega o status e o código porque quem sabe o significado da falha é o
 * domínio, não a camada HTTP. O handler central só traduz para problem+json.
 */
export abstract class ErroDeNegocio extends Error {
  abstract readonly status: number;
  abstract readonly codigo: CodigoDeErro;

  /** Campo do formulário ao qual a falha se refere, quando existir um. */
  readonly campo?: string;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
  }
}

export type CampoUnico = 'cpf' | 'email';

/** Violação de unicidade: o enunciado pede que cada cliente se cadastre uma vez só. */
export class ClienteJaCadastradoError extends ErroDeNegocio {
  readonly status = 409;
  override readonly codigo: CodigoDeErro;
  override readonly campo: CampoUnico;

  constructor(campo: CampoUnico) {
    super(campo === 'cpf' ? 'Este CPF já está cadastrado.' : 'Este e-mail já está cadastrado.');
    this.campo = campo;
    this.codigo =
      campo === 'cpf' ? CODIGOS_DE_ERRO.CPF_JA_CADASTRADO : CODIGOS_DE_ERRO.EMAIL_JA_CADASTRADO;
  }
}

/** Cor inexistente ou fora de circulação (`ativa = false`). */
export class CorNaoEncontradaError extends ErroDeNegocio {
  readonly status = 422;
  readonly codigo = CODIGOS_DE_ERRO.COR_NAO_ENCONTRADA;
  override readonly campo = 'corPreferidaId';

  constructor() {
    super('A cor escolhida não está disponível.');
  }
}
