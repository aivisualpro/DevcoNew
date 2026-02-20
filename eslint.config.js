import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(antfu(
  {
    rules: {
      // Allow trailing space in comments, for possible JSDoc formattings
      'style/no-trailing-spaces': ['error', { ignoreComments: true }],
      // Relaxes inline statements a bit
      'style/max-statements-per-line': ['error', { max: 2 }],
    },
  },
  // Allow trailing space for markdown formatting
  {
    files: ['**/*.md'],
    rules: {
      'style/no-trailing-spaces': 'off',
    },
  },
  // Server + config files legitimately use process/Buffer globals
  {
    files: ['server/**/*.ts', 'nuxt.config.ts'],
    rules: {
      'node/prefer-global/process': 'off',
      'node/prefer-global/buffer': 'off',
    },
  },
  // Service worker uses `self` (standard SW global)
  {
    files: ['public/sw.js'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
  // Chart components define multiple sub-components in one file
  {
    files: ['**/ui/chart/**/*.vue'],
    rules: {
      'vue/one-component-per-file': 'off',
    },
  },
  // Auth middleware legitimately uses process for env detection
  {
    files: ['app/middleware/**/*.ts'],
    rules: {
      'node/prefer-global/process': 'off',
    },
  },
))
