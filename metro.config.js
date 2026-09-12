// Learn more https://docs.expo.dev/guides/monorepos/#modify-the-metro-config
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build loads a wa-sqlite.wasm binary — Metro needs to
// know to treat .wasm as a servable asset rather than trying to parse it as JS.
config.resolver.assetExts.push('wasm');

module.exports = config;
