# VSCode Configuration

This directory contains recommended VSCode settings and extensions for the TW
Softball project.

## Setup

To use these settings:

1. Copy the contents of `.vscode.example/` to `.vscode/`:

   ```bash
   cp -r .vscode.example/* .vscode/
   ```

2. VSCode will automatically:
   - Apply the workspace settings
   - Prompt you to install recommended extensions
   - Configure TypeScript, ESLint, and Prettier integration

## What's Included

### `settings.json`

- TypeScript configuration optimized for monorepo
- ESLint integration with auto-fix on save
- Prettier formatting with consistent rules
- Path mappings for better IntelliSense across packages
- Vitest test runner integration
- File exclusions for better performance

### `extensions.json`

- **Essential**: TypeScript, ESLint, Prettier, Vitest
- **Git**: GitLens, GitHub Pull Requests
- **Development**: Path IntelliSense, Auto Rename Tag
- **Documentation**: Markdown support with linting
- **Quality**: EditorConfig support

## Benefits

- **Consistent Development Experience**: All team members get the same setup
- **Automated Formatting**: Code is formatted on save with Prettier
- **Real-time Linting**: ESLint errors and warnings shown in editor
- **Intelligent Navigation**: Jump between packages with proper path resolution
- **Integrated Testing**: Run and debug tests directly in VSCode
- **Git Integration**: Enhanced git workflow with GitLens and PR management

## Customization

Feel free to customize these settings for your personal preferences. The
`.vscode/` directory is gitignored, so your changes won't affect other
developers.
