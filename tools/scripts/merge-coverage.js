#!/usr/bin/env node

/**
 * Coverage Report Detector & Future Merger
 *
 * This script detects and logs coverage reports from all packages in the monorepo.
 * Will be enhanced to merge reports when multiple packages have substantial code.
 *
 * Phase 2 Status (Domain Layer): Currently serves as coverage detector and logger.
 * The domain package has 99%+ coverage while other packages are mostly empty.
 *
 * TODO (Phase 3+): Implement actual coverage merging when application/infrastructure
 * layers have substantial code (estimated 10+ source files each):
 * 1. Read coverage/coverage-final.json from each package with substantial code
 * 2. Merge file coverage data using Istanbul/NYC merge utilities
 * 3. Generate combined HTML reports and summary statistics
 * 4. Write merged reports to root coverage/ directory
 * 5. Update CI/CD to use merged coverage for quality gates
 *
 * Implementation approach:
 * - Use 'nyc merge' or similar tooling for proper coverage merging
 * - Maintain per-package reports alongside merged reports
 * - Handle path resolution for monorepo file references
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

/* eslint-disable no-console */

console.log('🔍 Checking for coverage reports...');

const packages = ['domain', 'application', 'infrastructure', 'shared'];
let hasReports = false;

// Check each package for coverage reports
packages.forEach(pkg => {
  const coveragePath = resolve(`packages/${pkg}/coverage/coverage-final.json`);
  if (existsSync(coveragePath)) {
    console.log(`✅ Found coverage for @twsoftball/${pkg}`);
    hasReports = true;
  } else {
    console.log(`⏭️  No coverage found for @twsoftball/${pkg}`);
  }
});

if (hasReports) {
  console.log('📊 Coverage reports detected and logged successfully');
  console.log('💡 Phase 2: Domain layer has substantial coverage, other layers pending');
} else {
  console.log('📋 No coverage reports found (packages are empty)');
}

console.log('✨ Coverage detection completed');
process.exit(0);
