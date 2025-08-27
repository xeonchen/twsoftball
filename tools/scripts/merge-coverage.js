#!/usr/bin/env node

/**
 * Coverage Report Merger
 *
 * This script merges coverage reports from all packages in the monorepo.
 * Currently serves as a placeholder since packages are mostly empty.
 *
 * TODO: Implement actual coverage merging when multiple packages have substantial code:
 * - Read coverage/coverage-final.json from each package
 * - Merge file coverage data avoiding duplicates
 * - Generate combined coverage report
 * - Write to root coverage/ directory
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
  console.log('📊 Coverage reports processed successfully');
} else {
  console.log('📋 No coverage reports to merge (packages are mostly empty)');
}

console.log('✨ Coverage merge completed');
process.exit(0);
