/**
 * @file Global E2E Test Setup
 *
 * Global setup for Playwright E2E tests.
 * Initializes test environment and shared resources.
 */

import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting E2E test setup...');

  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the app to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Verify critical resources are loaded
    await page.waitForSelector('[data-testid="app-ready"]', {
      timeout: 10000,
      state: 'attached',
    });

    console.log('✅ Application is ready for testing');

    // Initialize test data if needed
    await setupTestData(page);

    console.log('✅ E2E test setup completed successfully');
  } catch (error) {
    console.error('❌ E2E test setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Setup test data for E2E tests
 */
async function setupTestData(page: any) {
  // Clear any existing data (localStorage, sessionStorage, IndexedDB)
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();

    // Clear IndexedDB - delete all databases
    // eslint-disable-next-line no-undef
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        // eslint-disable-next-line no-undef
        indexedDB.deleteDatabase(db.name);
      }
    }
  });

  // Wait a bit for IndexedDB deletion to complete
  await page.waitForTimeout(500);

  // Initialize with clean state
  console.log('🧹 Test environment cleaned (localStorage, sessionStorage, IndexedDB)');
}

export default globalSetup;
