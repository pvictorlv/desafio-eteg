import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/build/**', '**/coverage/**', '**/generated/**', '**/*.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Erros silenciosos em promise sao a principal fonte de bug em Node.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // Permite `_` para argumentos deliberadamente ignorados.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    // Plugins e rotas do Fastify precisam ser async por contrato da
    // biblioteca, mesmo quando o corpo nao tem await. Nao ha o que corrigir
    // no codigo, entao a regra sai so nesses diretorios.
    files: ['apps/api/src/rotas/**/*.ts', 'apps/api/src/plugins/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    // O front roda no navegador, nao no Node. As regras de hooks pegam a
    // classe de bug mais comum em React: dependencia faltando no efeito.
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    // Arquivos de configuracao rodam fora do escopo de tipos dos pacotes.
    files: ['**/*.config.{js,ts}', '**/*.config.*.{js,ts}'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
