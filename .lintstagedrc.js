module.exports = {
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
    'vitest related --run'
  ],
  '*.{json,md,yaml,yml}': [
    'prettier --write'
  ],
  '*.{ts,tsx}': [
    'tsc --noEmit'
  ]
};