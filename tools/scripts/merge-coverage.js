#!/usr/bin/env node

/**
 * Coverage Report Merger
 *
 * This script merges coverage reports from all packages and apps in the monorepo
 * into a unified coverage report with HTML output and detailed statistics.
 *
 * Features:
 * - Discovers coverage from packages/* and apps/* directories
 * - Merges using Istanbul coverage utilities
 * - Generates combined JSON, LCOV, and HTML reports
 * - Creates organized root coverage/ directory structure
 * - Provides detailed coverage statistics per package/app
 * - Future-proofed for upcoming apps/web implementation
 * - Gracefully handles empty or placeholder coverage files
 *
 * Phase Support:
 * - Phase 2 (Current): Domain + Application packages
 * - Phase 3 (Future): Infrastructure implementation
 * - Phase 4 (Future): PWA implementation in apps/web
 * - Phase 5+: Additional apps without modification
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, symlinkSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { glob } from 'glob';
import coverageLib from 'istanbul-lib-coverage';
import reportLib from 'istanbul-lib-report';
import reportsLib from 'istanbul-reports';

const { createCoverageMap } = coverageLib;
const { createContext } = reportLib;
const { create } = reportsLib;

console.log('🔍 Discovering coverage reports across the monorepo...');

// Define all potential coverage sources
const coverageSources = [
  'packages/*/coverage/coverage-final.json',
  'apps/*/coverage/coverage-final.json',
];

// Discover all coverage files
const allCoverageFiles = [];
for (const pattern of coverageSources) {
  const files = glob.sync(pattern);
  allCoverageFiles.push(...files);
}

console.log(`📂 Found ${allCoverageFiles.length} potential coverage files`);

// Filter for files with actual coverage data
const validCoverageFiles = [];
const packageStats = new Map();

for (const file of allCoverageFiles) {
  try {
    const content = readFileSync(file, 'utf8');
    const coverage = JSON.parse(content);

    // Check if this is a real coverage file (not empty placeholder)
    const hasRealCoverage =
      Object.keys(coverage).length > 0 &&
      Object.values(coverage).some(fileCov => fileCov.s && Object.keys(fileCov.s).length > 0);

    if (hasRealCoverage) {
      validCoverageFiles.push(file);

      // Extract package/app name for statistics
      const parts = file.split('/');
      const type = parts[0]; // 'packages' or 'apps'
      const name = parts[1];
      const packageName = `${type}/${name}`;

      // Calculate basic stats for this package
      const fileCount = Object.keys(coverage).length;
      const totalStatements = Object.values(coverage).reduce(
        (total, fileCov) => total + Object.keys(fileCov.s || {}).length,
        0
      );
      const coveredStatements = Object.values(coverage).reduce(
        (total, fileCov) =>
          total + Object.values(fileCov.s || {}).filter(count => count > 0).length,
        0
      );

      packageStats.set(packageName, {
        files: fileCount,
        statements: totalStatements,
        covered: coveredStatements,
        percentage:
          totalStatements > 0
            ? Math.round((coveredStatements / totalStatements) * 100 * 100) / 100
            : 0,
      });

      console.log(
        `✅ Valid coverage found for ${packageName} (${fileCount} files, ${packageStats.get(packageName).percentage}% coverage)`
      );
    } else {
      const parts = file.split('/');
      const packageName = `${parts[0]}/${parts[1]}`;
      console.log(`⏭️  Skipping ${packageName} (empty/placeholder coverage)`);
    }
  } catch (error) {
    console.warn(`⚠️  Could not parse ${file}: ${error.message}`);
  }
}

if (validCoverageFiles.length === 0) {
  console.log('📋 No valid coverage reports found');
  console.log('💡 Run tests with coverage to generate reports: pnpm test:coverage');
  process.exit(0);
}

console.log(`\n🔄 Merging ${validCoverageFiles.length} coverage reports...`);

// Create merged coverage map
const mergedCoverageMap = createCoverageMap();

for (const file of validCoverageFiles) {
  try {
    const coverage = JSON.parse(readFileSync(file, 'utf8'));
    mergedCoverageMap.merge(coverage);
  } catch (error) {
    console.error(`❌ Error merging ${file}: ${error.message}`);
  }
}

// Ensure root coverage directory exists
const rootCoverageDir = resolve('coverage');
const mergedDir = resolve(rootCoverageDir, 'merged');

if (existsSync(rootCoverageDir)) {
  rmSync(rootCoverageDir, { recursive: true, force: true });
}
mkdirSync(mergedDir, { recursive: true });

console.log('📁 Created root coverage directory structure');

// Generate merged coverage reports
try {
  // 1. Write merged JSON
  const mergedJson = mergedCoverageMap.toJSON();
  writeFileSync(resolve(mergedDir, 'coverage-final.json'), JSON.stringify(mergedJson, null, 2));
  console.log('✅ Generated merged coverage-final.json');

  // 2. Generate LCOV report
  const lcovContext = createContext({
    dir: mergedDir,
    coverageMap: mergedCoverageMap,
  });
  const lcovReport = create('lcovonly');
  lcovReport.execute(lcovContext);
  console.log('✅ Generated merged lcov.info');

  // 3. Generate HTML report
  const htmlContext = createContext({
    dir: resolve(mergedDir, 'html'),
    coverageMap: mergedCoverageMap,
  });
  const htmlReport = create('html');
  htmlReport.execute(htmlContext);
  console.log('✅ Generated merged HTML report');
} catch (error) {
  console.error(`❌ Error generating reports: ${error.message}`);
  process.exit(1);
}

// Create symbolic links to individual package coverage
const packagesSymlinkDir = resolve(rootCoverageDir, 'packages');
const appsSymlinkDir = resolve(rootCoverageDir, 'apps');
mkdirSync(packagesSymlinkDir, { recursive: true });
mkdirSync(appsSymlinkDir, { recursive: true });

for (const file of validCoverageFiles) {
  const parts = file.split('/');
  const type = parts[0]; // 'packages' or 'apps'
  const name = parts[1];
  const sourceCoverageDir = resolve(type, name, 'coverage');

  if (existsSync(sourceCoverageDir)) {
    const targetDir = type === 'packages' ? packagesSymlinkDir : appsSymlinkDir;
    const symlinkPath = resolve(targetDir, name);
    const relativePath = relative(dirname(symlinkPath), sourceCoverageDir);

    try {
      symlinkSync(relativePath, symlinkPath);
      console.log(`🔗 Created symlink: coverage/${type}/${name} -> ${type}/${name}/coverage`);
    } catch (error) {
      // Symlink creation might fail on some systems, it's not critical
      console.warn(`⚠️  Could not create symlink for ${type}/${name}: ${error.message}`);
    }
  }
}

// Generate and display summary statistics
const summary = mergedCoverageMap.getCoverageSummary();
const overallStats = {
  statements: {
    covered: summary.statements.covered,
    total: summary.statements.total,
    percentage: Math.round(summary.statements.pct * 100) / 100,
  },
  branches: {
    covered: summary.branches.covered,
    total: summary.branches.total,
    percentage: Math.round(summary.branches.pct * 100) / 100,
  },
  functions: {
    covered: summary.functions.covered,
    total: summary.functions.total,
    percentage: Math.round(summary.functions.pct * 100) / 100,
  },
  lines: {
    covered: summary.lines.covered,
    total: summary.lines.total,
    percentage: Math.round(summary.lines.pct * 100) / 100,
  },
};

// Write summary to file
writeFileSync(
  resolve(rootCoverageDir, 'summary.json'),
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      packages: Object.fromEntries(packageStats),
      overall: overallStats,
    },
    null,
    2
  )
);

// Display results
console.log('\n📊 Coverage Merge Summary');
console.log('═══════════════════════════════════════');

console.log('\n📦 Per-Package Coverage:');
for (const [pkg, stats] of packageStats.entries()) {
  console.log(
    `   ${pkg.padEnd(20)} ${stats.percentage.toString().padStart(6)}% (${stats.covered}/${stats.statements} statements)`
  );
}

console.log('\n🎯 Overall Project Coverage:');
console.log(
  `   Statements: ${overallStats.statements.percentage}% (${overallStats.statements.covered}/${overallStats.statements.total})`
);
console.log(
  `   Branches:   ${overallStats.branches.percentage}% (${overallStats.branches.covered}/${overallStats.branches.total})`
);
console.log(
  `   Functions:  ${overallStats.functions.percentage}% (${overallStats.functions.covered}/${overallStats.functions.total})`
);
console.log(
  `   Lines:      ${overallStats.lines.percentage}% (${overallStats.lines.covered}/${overallStats.lines.total})`
);

console.log('\n📁 Generated Reports:');
console.log(`   📄 JSON:  coverage/merged/coverage-final.json`);
console.log(`   📄 LCOV:  coverage/merged/lcov.info`);
console.log(`   🌐 HTML:  coverage/merged/html/index.html`);
console.log(`   📊 Stats: coverage/summary.json`);

console.log('\n✨ Coverage merge completed successfully!');

// Exit with appropriate code for CI
const meetsThreshold = overallStats.statements.percentage >= 80; // From vitest.config.ts
process.exit(meetsThreshold ? 0 : 1);
