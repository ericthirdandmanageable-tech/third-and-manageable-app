// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const nativeResolverRules = Object.fromEntries(
  expoConfig
    .flatMap((config) => Object.keys(config.rules ?? {}))
    .filter((ruleName) => ruleName.startsWith('import/'))
    .map((ruleName) => [ruleName, 'off']),
);

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['.expo/**', 'dist/*'],
    // The Expo preset's TypeScript resolver uses a native optional binding.
    // Node's resolver understands this app's relative imports; the @ alias is
    // validated by TypeScript, so keeping lint resolution native-free makes
    // local and CI checks deterministic.
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      },
    },
    rules: nativeResolverRules,
  },
]);
