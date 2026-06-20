import baseConfig from '@httparchive/eslint-config';
import globals from 'globals';

export default [
  ...baseConfig,
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];

