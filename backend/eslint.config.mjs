import eslint from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  // Global ignores MUST live in their own config object: an `ignores` key that
  // shares an object with other keys only scopes that object, so
  // `src/generated/i18n.generated.ts` was still being linted and `--fix` was
  // deleting the generator's leading `/* eslint-disable */` (leaving a stray
  // space), which dirtied the working tree on every lint/commit.
  {
    ignores: [
      'eslint.config.mjs',
      'docs/.vuepress/**/*',
      'src/generated/i18n.generated.ts',
    ],
  },
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  prettierRecommended,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
