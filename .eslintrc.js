module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: ['airbnb-base', 'prettier'],
  parserOptions: {
    ecmaVersion: 12,
  },
  ignorePatterns: [
    'commands-old/**',
    'test.js',
    'node_modules/**',
    'coverage/**',
  ],
  overrides: [
    {
      files: ['test/**/*.js'],
      rules: {
        'import/no-unresolved': 'off', // Test files use require() for test framework
        'import/no-dynamic-require': 'off', // Test files dynamically require modules
        'global-require': 'off', // Test files use require() at top level
        'prefer-destructuring': 'off', // Test files may not use destructuring
      },
    },
  ],
};
