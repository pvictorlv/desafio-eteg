import { ErroDaApi, ErroDeConexao } from '../api/http';

/** Contexto técnico do erro. Ver a restrição de conteúdo em `registrarErro`. */
type Contexto = Record<string, string | number | boolean | null | undefined>;

const STATUS_DE_SERVIDOR = 500;

/**
 * Funil único por onde todo erro do front passa.
 *
 * Hoje ele só escreve no console. O ponto não é o destino, é existir um lugar
 * só: ligar um coletor (Sentry, como a API já faz) vira uma alteração nesta
 * função, e não uma caçada por `catch` espalhado pelo código.
 *
 * **Nada de dado pessoal aqui.** A API redige nome, CPF e e-mail na origem
 * porque log sai da máquina e não volta; um relatório de erro do navegador sai
 * igual. Por isso `Contexto` não aceita objeto: passar `{ dados }` inteiro
 * seria fácil demais, e o formulário inteiro iria junto.
 */
export function registrarErro(erro: unknown, contexto: Contexto = {}): void {
  console.error('[cadastro] erro não tratado', { erro, ...contexto });
}

/**
 * Falha que o produto já explica na tela e o usuário resolve sozinho: CPF
 * repetido, campo inválido, internet fora. Registrar isso viraria ruído e
 * afogaria o que importa.
 */
export function ehFalhaEsperada(erro: unknown): boolean {
  if (erro instanceof ErroDeConexao) {
    return true;
  }

  return erro instanceof ErroDaApi && erro.status < STATUS_DE_SERVIDOR;
}

/**
 * Captura o que escapa do React: erro dentro de `setTimeout`, promessa
 * rejeitada sem `catch`, falha ao carregar um pedaço do bundle. Sem isto,
 * esses casos morrem no console de quem estava usando a página.
 */
export function instalarCapturaGlobal(): void {
  window.addEventListener('error', (evento) => {
    registrarErro(evento.error ?? evento.message, {
      origem: 'window.error',
      arquivo: evento.filename,
      linha: evento.lineno,
    });
  });

  window.addEventListener('unhandledrejection', (evento) => {
    registrarErro(evento.reason, { origem: 'unhandledrejection' });
  });
}
