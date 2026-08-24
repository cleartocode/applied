// Flat config. `npm run lint`
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettier,
  {
    ignores: ['node_modules/**', 'ios/**', 'android/**', '.expo/**', 'dist/**'],
  },
  {
    rules: {
      // The frame loop reads shared values that must not appear in dep arrays —
      // adding them would recreate the worklet and reset the model every render.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
