/**
 * @file PWA Installability E2E Tests
 *
 * Tests for Progressive Web App installability requirements specific to
 * mobile devices and responsive layouts including:
 * - Mobile touch target compliance (WCAG AAA - 48px minimum)
 * - Responsive layout across device viewports
 *
 * @remarks
 * These tests focus on mobile-specific installability requirements.
 * Basic PWA requirements (manifest, service worker, icons, iOS Safari
 * compatibility) are covered in pwa-basics.spec.ts to avoid duplication.
 */

import { test, expect, devices, BrowserContext } from '@playwright/test';

test.describe('PWA Installability', () => {
  test.describe('Mobile Touch Targets', () => {
    test('should have minimum touch target sizes on mobile', async ({ browser }) => {
      // Use iPhone 12 viewport
      let context: BrowserContext | undefined;
      try {
        context = await browser.newContext({
          ...devices['iPhone 12'],
        });
        const page = await context.newPage();

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check all buttons meet minimum 48px touch target (WCAG AAA)
        const buttons = await page.locator('button').all();

        for (const button of buttons) {
          const box = await button.boundingBox();
          if (box) {
            // WCAG AAA requires minimum 48px touch targets
            expect(box.height).toBeGreaterThanOrEqual(48);
            expect(box.width).toBeGreaterThanOrEqual(48);
          }
        }
      } finally {
        await context?.close();
      }
    });

    test('should have proper viewport meta tag', async ({ page }) => {
      await page.goto('/');

      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toBeTruthy();
      expect(viewport).toContain('width=device-width');
      expect(viewport).toContain('initial-scale=1');
    });

    test('should not have horizontal overflow on mobile', async ({ browser }) => {
      let context: BrowserContext | undefined;
      try {
        context = await browser.newContext({
          ...devices['iPhone 12'],
        });
        const page = await context.newPage();

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check for horizontal overflow
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasHorizontalOverflow).toBe(false);
      } finally {
        await context?.close();
      }
    });
  });

  test.describe('Responsive Layout', () => {
    test('should display correctly on tablet viewport', async ({ browser }) => {
      let context: BrowserContext | undefined;
      try {
        context = await browser.newContext({
          ...devices['iPad (gen 7)'],
        });
        const page = await context.newPage();

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify page renders without errors
        const root = page.locator('#root');
        await expect(root).toBeVisible();

        // Check no horizontal overflow
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalOverflow).toBe(false);
      } finally {
        await context?.close();
      }
    });

    test('should display correctly on small mobile viewport', async ({ browser }) => {
      let context: BrowserContext | undefined;
      try {
        context = await browser.newContext({
          ...devices['iPhone SE'],
        });
        const page = await context.newPage();

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify page renders without errors
        const root = page.locator('#root');
        await expect(root).toBeVisible();

        // Check no horizontal overflow
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalOverflow).toBe(false);
      } finally {
        await context?.close();
      }
    });
  });
});
