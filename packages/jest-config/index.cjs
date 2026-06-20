/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ['**/*.js', '!index.js', '!coverage/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  globals: { __filename: false, __dirname: false },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
  transform: {},
};
