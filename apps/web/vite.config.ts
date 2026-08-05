import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const PORTA_DO_FRONT = 5173;
const URL_DA_API = process.env['VITE_URL_DA_API'] ?? 'http://localhost:3000';

// Em produção a própria API vai servir estes arquivos, então tudo sai da mesma
// origem. O proxy reproduz isso em desenvolvimento: o código do front chama
// /api/... sem saber onde a API está, e não há CORS no caminho.
//
// `/docs` entra junto porque o rodapé aponta para lá — sem o proxy o link cai
// no fallback da SPA em vez de abrir o Swagger UI.
const PROXY = {
  '/api': { target: URL_DA_API, changeOrigin: true },
  '/docs': { target: URL_DA_API, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],

  server: { port: PORTA_DO_FRONT, proxy: PROXY },

  // O mesmo proxy no `preview`, para dar para conferir o bundle de produção
  // sem subir a imagem inteira.
  preview: { port: PORTA_DO_FRONT, proxy: PROXY },

  build: {
    outDir: 'dist',
    // Sem sourcemap: `hidden` ainda grava os .map no dist, que a API serviria
    // junto com o resto — código-fonte público sem nada em troca, porque não
    // há coletor consumindo esses mapas. Quando entrar um (ver
    // infra/monitoramento.ts), o par certo é 'hidden' mais o upload dos .map
    // para o coletor no build, fora da imagem.
    sourcemap: false,
  },
});
