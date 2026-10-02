/** @type {import('lint-staged').Config} */
module.exports = {
  'frontend/**/*.{ts,tsx,js,jsx}': () => 'pnpm --filter frontend lint',
  'backend/**/*.ts': () => 'pnpm --filter backend lint',
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
