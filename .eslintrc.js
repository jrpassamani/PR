// ESLint (Fase 14). Base do Expo + regras leves de higiene/segurança.
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['node_modules/', 'dist/', 'android/', 'ios/', '.expo/', 'scripts/'],
  rules: {
    // Higiene: nada de console solto em produção (evita vazar dados em logs).
    'no-console': 'warn',
  },
};
