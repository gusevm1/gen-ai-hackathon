import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    ignores: ['dist/', 'data/', 'node_modules/'],
  },
);
