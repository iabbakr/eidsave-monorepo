const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the monorepo root (for packages in lib/* and root node_modules)
config.watchFolders = [monorepoRoot];

// 2. Resolve modules from both local and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Prevent pnpm symlink resolution issues
config.resolver.disableHierarchicalLookup = false;

// 4. Force explicit transformer path so Xcode doesn't evaluate it as undefined
try {
  config.transformer.babelTransformerPath = require.resolve(
    "@expo/metro-config/babel-transformer"
  );
} catch (e) {
  // Fallback if directly using metro-react-native-babel-transformer
}

module.exports = config;