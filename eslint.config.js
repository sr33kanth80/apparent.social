import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.agents/**',
      '.claude/**',
      '.design-sync/**',
      '.ds-sync/**',
      'dist/**',
      'node_modules/**',
      'apparent-logo-lottie/**',
      'apparent-promo-video/**',
      'cli/**',
      'ds-bundle/**',
      'landing-experiment/**',
      'promo/**',
      'public/**',
      'supabase/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'api/**/*.js', 'server/**/*.js', 'tests/**/*.js', 'scripts/**/*.{js,mjs}', '*.config.{js,ts}', 'vite.config.ts'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-useless-assignment': 'off',
      'no-useless-escape': 'off',
    },
  },
);
