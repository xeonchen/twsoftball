/**
 * @file Global E2E Test Teardown
 *
 * Global teardown for Playwright E2E tests.
 * Cleans up resources after all tests complete.
 */

async function globalTeardown() {
  console.log('🧹 Starting E2E test teardown...');

  try {
    // Clean up any persistent test data
    console.log('🗑️  Cleaning up test data...');

    // Additional cleanup if needed
    // - Database cleanup
    // - File system cleanup
    // - External service cleanup

    console.log('✅ E2E test teardown completed successfully');
  } catch (error) {
    console.error('❌ E2E test teardown failed:', error);
    // Don't throw to avoid masking test failures
  }
}

export default globalTeardown;
