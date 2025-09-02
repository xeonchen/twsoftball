module.exports = {
  '*.{ts,tsx,js,jsx}': [
    'prettier --write',
    'eslint --fix'
  ],
  '*.{json,md,yaml,yml}': [
    'prettier --write'
  ],
  '*.{ts,tsx}': [
    () => 'tsc --noEmit'
  ]
};
