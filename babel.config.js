module.exports = function (api) {
  api.cache(true);
  // O alias "@/..." é resolvido pelo Metro via paths do tsconfig.json
  // (suporte nativo do expo/metro-config a partir do SDK 49).
  return {
    presets: ['babel-preset-expo'],
  };
};
