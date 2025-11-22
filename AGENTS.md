# Repository Guidelines

## Project Structure & Module Organization

TW Softball is a pnpm monorepo: domain logic in `packages/domain`, use cases in
`packages/application`, adapters in `packages/infrastructure`, and cross-cutting
utilities in `packages/shared`. The Feature-Sliced React PWA lives in
`apps/web`; automated suites sit in `tests/`, tooling scripts in `tools/`, and
design docs in `docs/`. Record delivered work and next steps in `TODO.local.md`
whenever you land a meaningful PR.

## Architecture & Layering Rules

We enforce Hexagonal Architecture with a Composition Root in the web layer that
instantiates application services via infrastructure `config/` factories. Follow
Feature-Sliced boundaries
(`shared → entities → features → widgets → pages → app`) and export through
slice `index.ts` files. Keep dependencies flowing downward only, never import
infrastructure inside the application layer, and run `pnpm deps:check` plus
`pnpm fsd:check` before reviews.

## Build, Test, and Development Commands

- `pnpm dev` starts the Vite-powered PWA.
- `pnpm build` triggers `turbo run build` across packages.
- `pnpm test`, `pnpm test:watch`, and `pnpm test:coverage` run Vitest suites
  (coverage merges via `tools/scripts/merge-coverage.js`).
- `pnpm --filter @twsoftball/<package> <script>` scopes commands to a single
  package.
- `pnpm lint`, `pnpm format`, `pnpm typecheck`, and
  `pnpm deps:check`/`pnpm fsd:staged` guard style, types, and architecture.

## Coding Style & Naming Conventions

TypeScript runs in strict mode. ESLint (`eslint.config.js`) combines Airbnb,
security, and boundary rules—avoid disabling checks without discussion. Prettier
(`.prettierrc.cjs`) enforces 2-space indentation, 100-character lines (80 for
Markdown), single quotes, and trailing commas. Use `.test.ts` suffixes,
`PascalCase` React components, `camelCase` utilities, and maintain
Feature-Sliced folders such as `shared/ui` or `entities/model`.

## Testing Guidelines

Vitest handles unit and integration coverage; co-locate specs with source and
place cross-package flows in `tests/` or package `test-factories`. CI enforces
≥96% domain, 90% application, 80% infrastructure, 70% web coverage—treat these
as the floor. Run `pnpm test:coverage` and `pnpm fsd:check` on structural
updates, and execute `pnpm --filter @twsoftball/web test:e2e` (or `:headed`) for
Playwright smoke.

## Commit, Pull Request, and QA Expectations

Use Conventional Commits (`type(scope): summary`) like
`feat(application): add rulesConfig support...`. Before committing, run lint,
typecheck, format checks, dependency cruise, and the relevant test suite.
Execute `pnpm commit-readiness-reviewer` (see `CLAUDE.md`) to catch
architectural drift. PRs must link issues, summarise impact, include command
output or coverage deltas, attach UI evidence for `apps/web` changes, and
refresh `TODO.local.md` plus referenced docs after merge.
