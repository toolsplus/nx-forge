import baseConfig from '../../eslint.config.mjs';

export default [
  {
    ignores: ['**/dist', '**/out-tsc'],
  },
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-constant-condition': [
        'error',
        {
          checkLoops: false,
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    files: [
      './package.json',
      './generators.json',
      './executors.json',
      './migrations.json',
    ],
    rules: {
      '@nx/nx-plugin-checks': 'error',
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['./package.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredDependencies: [
            'nx',
            // Nx tooling packages that the application generator loads with
            // `ensurePackage` at the workspace's Nx version. Declaring them
            // would install a copy that can differ from the workspace's Nx
            // version and write mismatched versions to its package.json.
            '@nx/eslint',
            '@nx/jest',
            '@nx/vitest',
            '@nx/webpack',
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
