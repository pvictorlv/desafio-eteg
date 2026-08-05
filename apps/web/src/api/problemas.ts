import {
  CODIGOS_DE_ERRO,
  esquemaCadastroCliente,
  type CodigoDeErro,
  type EntradaCadastroCliente,
  type Problema,
} from '@desafio-eteg/contratos';
import { ErroDaApi, ErroDeConexao } from './http';

const STATUS_EXCESSO_DE_TENTATIVAS = 429;

const MENSAGEM_GENERICA = 'Algo deu errado ao enviar o cadastro. Tente de novo em instantes.';

/**
 * Códigos cujo `detail` foi escrito para quem preenche o formulário e pode ir
 * direto para a tela.
 *
 * O resto não pode. A API usa `DADOS_INVALIDOS` como pega-tudo para qualquer
 * 4xx do Fastify (`plugins/erros.ts`), com `detail: erro.message` — então um
 * 404 exibiria "Nada responde em POST /api/clientes" e um JSON malformado
 * exibiria a mensagem do parser. São recados de desenvolvedor, e ainda vazam
 * rota e método na interface.
 */
const CODIGOS_COM_MENSAGEM_PUBLICA: readonly CodigoDeErro[] = [
  CODIGOS_DE_ERRO.CPF_JA_CADASTRADO,
  CODIGOS_DE_ERRO.EMAIL_JA_CADASTRADO,
  CODIGOS_DE_ERRO.COR_NAO_ENCONTRADA,
  CODIGOS_DE_ERRO.ERRO_INTERNO,
];

function mensagemPublica(problema: Problema): string {
  return CODIGOS_COM_MENSAGEM_PUBLICA.includes(problema.codigo)
    ? (problema.detail ?? problema.title)
    : MENSAGEM_GENERICA;
}

/**
 * Nomes de campo aceitos, tirados do próprio esquema em vez de escritos à mão.
 * Se um campo for renomeado no contrato, esta lista acompanha.
 */
const CAMPOS_DO_FORMULARIO: readonly string[] = esquemaCadastroCliente.keyof().options;

type CampoDoFormulario = keyof EntradaCadastroCliente;

export interface ErroDeCampo {
  campo: CampoDoFormulario;
  mensagem: string;
}

export interface FalhaNoCadastro {
  /** Erros que têm um campo a culpar, para destacar no formulário. */
  porCampo: ErroDeCampo[];
  /** Mensagem do aviso geral, quando não dá para apontar um campo. */
  avisoGeral: string | null;
}

/**
 * Traduz o que o envio lançou em algo que a tela sabe mostrar.
 *
 * A decisão sai de `campo` e `erros` do problem+json, nunca do texto da
 * mensagem. Interpretar texto quebra na primeira vez que alguém melhora a
 * redação de um erro no servidor.
 */
export function interpretarFalha(erro: unknown): FalhaNoCadastro {
  if (erro instanceof ErroDeConexao) {
    return {
      porCampo: [],
      avisoGeral: 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.',
    };
  }

  if (!(erro instanceof ErroDaApi)) {
    return { porCampo: [], avisoGeral: MENSAGEM_GENERICA };
  }

  if (erro.status === STATUS_EXCESSO_DE_TENTATIVAS) {
    return {
      porCampo: [],
      avisoGeral: 'Foram muitos envios seguidos. Espere um minuto e tente de novo.',
    };
  }

  const problema = erro.problema;

  if (!problema) {
    return { porCampo: [], avisoGeral: MENSAGEM_GENERICA };
  }

  // 422 de validação: a API devolve um erro por campo.
  if (problema.erros && problema.erros.length > 0) {
    const porCampo = problema.erros.flatMap((falha) =>
      ehCampoDoFormulario(falha.campo) ? [{ campo: falha.campo, mensagem: falha.mensagem }] : [],
    );

    return {
      porCampo,
      // Se nenhum dos campos existe aqui, o formulário não tem o que destacar
      // e a pessoa ficaria sem explicação nenhuma.
      avisoGeral: porCampo.length > 0 ? null : mensagemPublica(problema),
    };
  }

  // 409 de CPF ou e-mail repetido, e o 422 de cor indisponível.
  if (problema.campo && ehCampoDoFormulario(problema.campo)) {
    return {
      porCampo: [{ campo: problema.campo, mensagem: mensagemPublica(problema) }],
      avisoGeral: null,
    };
  }

  return { porCampo: [], avisoGeral: mensagemPublica(problema) };
}

function ehCampoDoFormulario(campo: string): campo is CampoDoFormulario {
  return CAMPOS_DO_FORMULARIO.includes(campo);
}
