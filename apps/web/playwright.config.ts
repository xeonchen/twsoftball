/**
 * @file Playwright Configuration
 *
 * E2E testing configuration for TW Softball application.
 * Optimized for lineup management and game recording workflows.
 *
 * @remarks
 * This configuration provides comprehensive E2E testing setup:
 * - Cross-browser testing (Chrome, Firefox, Safari)
 * - Mobile device simulation
 * - Accessibility testing integration
 * - Visual regression testing
 * - Performance monitoring
 * - CI/CD optimized settings
 *
 * Test Strategy:
 * - Critical user journeys for lineup management
 * - Accessibility compliance validation
 * - Mobile-first responsive testing
 * - Offline functionality verification
 * - Performance baseline establishment
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env['CI'],

  /* Retry on CI only */
  retries: process.env['CI'] ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env['CI'] ? 1 : 4,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: './e2e/playwright-report' }],
    ['json', { outputFile: './e2e/test-results/results.json' }],
    ...(process.env['CI'] ? [['github'] as const] : [['list'] as const]),
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',

    /* Capture video on failure */
    video: 'retain-on-failure',

    /* Global timeout for each action */
    actionTimeout: 10000,

    /* Global timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile devices (primary use case for softball app)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet devices
    {
      name: 'Mobile Safari Landscape',
      use: {
        ...devices['iPad Pro 11 landscape'],
        // Test landscape orientation for tablets
      },
    },

    // Accessibility testing project
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Enable accessibility features - these are set via launch options
      },
      testMatch: '**/*.accessibility.spec.ts',
    },

    // Performance testing project
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Slower CPU simulation for performance testing
        launchOptions: {
          args: ['--cpu-slowdown-ratio=2'],
        },
      },
      testMatch: '**/*.performance.spec.ts',
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },

  /* Global setup and teardown */
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  /* Test timeout */
  timeout: 30000,
  expect: {
    /* Timeout for expect() calls */
    timeout: 5000,
    /* Threshold for visual comparisons */
    toMatchSnapshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
    },
  },
});
