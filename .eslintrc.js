module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: ['airbnb-base', 'prettier'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  ignorePatterns: [
    'commands-old/**',
    'test.js',
    'node_modules/**',
    'coverage/**',
    'vitest.config.js',
  ],
  overrides: [
    {
      files: ['test/**/*.js'],
      parserOptions: {
        sourceType: 'module',
      },
      rules: {
        // Allow ESM imports in test files
        'import/no-unresolved': 'off',
        'import/no-dynamic-require': 'off',
        'import/extensions': 'off',
        'global-require': 'off',
        'prefer-destructuring': 'off',
        // Allow for-of loops in tests
        'no-restricted-syntax': 'off',
        'no-await-in-loop': 'off',
        // Allow __dirname in ESM
        'no-underscore-dangle': 'off',
        // Allow unused vars starting with underscore
        'no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        // Allow arrow function body styles in tests
        'arrow-body-style': 'off',
        // Allow promise executors to return
        'no-promise-executor-return': 'off',
      },
    },
  ],
};
