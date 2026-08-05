import { resolve } from 'node:path';
import estaticos from '@fastify/static';
import fp from 'fastify-plugin';

const ARQUIVO_DE_ENTRADA = 'index.html';

const UM_ANO_EM_SEGUNDOS = 31_536_000;

/**
 * Serve a SPA já compilada pela mesma origem da API.
 *
 * É o que permite entregar uma imagem só, como o enunciado pede ("o Jorge vai
 * subir a imagem num serviço terceirizado"). De quebra, front e API passam a
 * viver na mesma origem: some o CORS e o CSP do helmet fica realmente fechado.
 *
 * Fica desligado quando `DIRETORIO_DO_FRONT` não é informado — em
 * desenvolvimento quem serve a tela é o Vite, com recarregamento a quente.
 */
export const pluginDeEstaticos = fp(
  async (app, { diretorio }: { diretorio: string }) => {
    await app.register(estaticos, {
      root: resolve(diretorio),
      // Sem curinga: o plugin registra uma rota por arquivo existente e deixa
      // o resto do caminho livre para o desvio da SPA, logo abaixo. Com o
      // curinga ligado seriam duas rotas `/*` disputando a mesma requisição.
      wildcard: false,
      // O cache é decidido arquivo a arquivo logo abaixo, e não pelo padrão
      // do plugin.
      cacheControl: false,
      setHeaders: (resposta, caminho) => {
        // O nome dos arquivos do bundle carrega o hash do conteúdo: mudou o
        // conteúdo, mudou o nome. Guardá-los para sempre é seguro.
        // O index.html não tem hash — é ele que aponta para os demais, e um
        // cache longo deixaria o navegador preso na versão anterior.
        resposta.header(
          'cache-control',
          caminho.endsWith(ARQUIVO_DE_ENTRADA)
            ? 'no-cache'
            : `public, max-age=${UM_ANO_EM_SEGUNDOS}, immutable`,
        );
      },
    });

    // Qualquer caminho que não seja arquivo nem rota da API devolve a casca da
    // SPA, para o roteamento acontecer no navegador. Sem isto, abrir uma URL
    // interna direto (ou dar F5 nela) cairia em 404.
    app.get('/*', (requisicao, resposta) => {
      // Fora da SPA: quem responde é o tratador de 404, em problem+json.
      // Devolver HTML aqui faria o cliente da API receber uma página em vez do
      // erro que ele sabe ler.
      if (requisicao.url.startsWith('/api/')) {
        return resposta.callNotFound();
      }

      return resposta.sendFile(ARQUIVO_DE_ENTRADA);
    });
  },
  { name: 'estaticos' },
);
