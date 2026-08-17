// Config do Metro baseada no padrão do Expo.
// Habilita explicitamente a resolução de "package exports" (subpaths como
// "@noble/ciphers/aes" e "@noble/hashes/scrypt") usados pela cifra de backup.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
