module.exports = {
  '*.{ts,tsx,js,jsx}': [
    'prettier --write',
    'eslint --fix --max-warnings 0'
  ],
  '*.{json,md,yaml,yml}': [
    'prettier --write'
  ],
  '*.{ts,tsx}': [
    () => 'turbo run typecheck --force'
  ]
};
