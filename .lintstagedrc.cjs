module.exports = {
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write'
  ],
  '*.{json,md,yaml,yml}': [
    'prettier --write'
  ],
  '*.{ts,tsx}': [
    () => 'tsc --project tsconfig.lint.json'
  ]
};
