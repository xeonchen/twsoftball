module.exports = {
  '*.{ts,tsx,js,jsx}': [
    'prettier --write',
    'eslint --fix --max-warnings 0 --no-warn-ignored'
  ],
  '*.{json,md,yaml,yml}': [
    'prettier --write'
  ],
  '*.{ts,tsx}': [
    () => 'turbo run typecheck --force'
  ]
};
