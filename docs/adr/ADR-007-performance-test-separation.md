# ADR-007: Separate Performance Tests from Correctness Tests

## Status

Accepted - Date: 2025-09-21

## Context

- CI failures due to flaky timing-dependent tests in
  PerformanceBenchmark.test.ts
- Performance measurements vary significantly in CI environments (51% vs 50%
  threshold)
- Need clear distinction between mandatory correctness and optional performance
  testing
- Following infrastructure package pattern established in commit 26c6697

## Decision

- Use `.perf.test.ts` naming convention for performance tests that measure
  actual timing/performance
- Exclude performance tests from CI runs using `--exclude '**/*.perf.test.ts'`
- Run performance tests locally only for optimization work using
  `pnpm test:perf`
- Keep correctness tests in `.test.ts` files for CI validation
- Remove complex environment-aware variance thresholds since performance tests
  won't run in CI

## Consequences

### Positive

- More stable CI pipeline without flaky timing-dependent tests
- Clearer test intent and purpose - developers know what each test validates
- Developers explicitly choose when to run performance tests
- No complex environment detection needed
- Consistent pattern across all packages

### Negative

- Performance regressions won't be automatically detected in CI
- Developers must remember to run performance tests locally when optimizing
- Slight increase in cognitive overhead for test type selection

## Implementation

- Extract timing variance test from `PerformanceBenchmark.test.ts` to
  `PerformanceBenchmark.perf.test.ts`
- Update web package.json scripts to exclude `.perf.test.ts` from standard test
  runs
- Update vitest.config.ts to include performance test patterns
- Document conventions in testing-strategy.md

## Implementation Timeline

- **2025-09-21**: Performance test separation implemented
- **Target**: CI stability achieved by removing timing-dependent tests
- **Verification**: All test commands working correctly with proper separation

## References

- Related to CI failures in PR #16
- Follows pattern from commit 26c6697 (infrastructure package separation)
