import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],

  test: {
    // Os componentes precisam de DOM: o que se afirma aqui é o que a pessoa vê.
    environment: 'jsdom',
    include: ['testes/**/*.test.tsx'],
    setupFiles: ['testes/preparo.ts'],
  },
});
