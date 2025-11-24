/**
 * @file PWA Basics E2E Tests
 *
 * Tests for Progressive Web App fundamentals including:
 * - Web manifest validation
 * - PWA meta tags verification
 * - Service worker registration
 * - Offline capability basics
 *
 * @remarks
 * These tests verify the core PWA requirements for installation and
 * offline-first capabilities. The app should be installable on mobile
 * devices and function without network connectivity.
 */

import { test, expect } from '@playwright/test';

test.describe('PWA Basics', () => {
  test('should serve valid web manifest', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest');
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();
    expect(manifest).toBeDefined();
    expect(manifest.name).toBe('TW Softball');
    expect(manifest.short_name).toBe('TWSoftball');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#2E7D32');
    expect(manifest.background_color).toBe('#FFFFFF');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    // Verify icon properties
    const icon192 = manifest.icons.find((icon: { sizes: string }) => icon.sizes === '192x192');
    const icon512 = manifest.icons.find((icon: { sizes: string }) => icon.sizes === '512x512');

    expect(icon192).toBeDefined();
    expect(icon192.type).toBe('image/png');
    expect(icon512).toBeDefined();
    expect(icon512.type).toBe('image/png');
  });

  test('should have required PWA meta tags', async ({ page }) => {
    await page.goto('/');

    // Theme color
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBe('#2E7D32');

    // Apple mobile web app meta tags
    const appleCapable = await page
      .locator('meta[name="apple-mobile-web-app-capable"]')
      .getAttribute('content');
    expect(appleCapable).toBe('yes');

    const appleStatusBar = await page
      .locator('meta[name="apple-mobile-web-app-status-bar-style"]')
      .getAttribute('content');
    expect(appleStatusBar).toBe('default');

    const appleTitle = await page
      .locator('meta[name="apple-mobile-web-app-title"]')
      .getAttribute('content');
    expect(appleTitle).toBe('TW Softball');
  });

  test('should have apple touch icon link', async ({ page }) => {
    await page.goto('/');

    const appleTouchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect(appleTouchIcon).toBe('/apple-touch-icon.png');
  });

  test('should have manifest link', async ({ page }) => {
    await page.goto('/');

    // Use first() in case multiple manifest links exist (VitePWA auto-injects)
    const manifestLink = await page.locator('link[rel="manifest"]').first().getAttribute('href');
    expect(manifestLink).toBe('/manifest.webmanifest');
  });

  test('should serve PWA icons with correct sizes', async ({ page }) => {
    // Test 192x192 icon
    const icon192Response = await page.goto('/icon-192.png');
    expect(icon192Response?.status()).toBe(200);
    expect(icon192Response?.headers()['content-type']).toContain('image/png');

    // Test 512x512 icon
    const icon512Response = await page.goto('/icon-512.png');
    expect(icon512Response?.status()).toBe(200);
    expect(icon512Response?.headers()['content-type']).toContain('image/png');

    // Test apple touch icon
    const appleIconResponse = await page.goto('/apple-touch-icon.png');
    expect(appleIconResponse?.status()).toBe(200);
    expect(appleIconResponse?.headers()['content-type']).toContain('image/png');
  });

  test('should serve favicon', async ({ page }) => {
    const faviconResponse = await page.goto('/favicon.ico');
    expect(faviconResponse?.status()).toBe(200);
  });

  test('should register service worker', async ({ page }) => {
    await page.goto('/');

    // Wait for service worker to be registered using event-driven approach
    const hasServiceWorker = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Use navigator.serviceWorker.ready which resolves when SW is active
          const registration = await navigator.serviceWorker.ready;
          return !!registration;
        } catch {
          return false;
        }
      }
      return false;
    });

    expect(hasServiceWorker).toBe(true);
  });

  test('should have service worker in ready state', async ({ page }) => {
    await page.goto('/');

    const swState = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return {
          scope: registration.scope,
          active: !!registration.active,
        };
      }
      return null;
    });

    expect(swState).not.toBeNull();
    expect(swState?.active).toBe(true);
    expect(swState?.scope).toMatch(/https?:\/\/.*:\d+\//);
  });

  test('should serve offline.html fallback page', async ({ page }) => {
    const response = await page.goto('/offline.html');
    expect(response?.status()).toBe(200);

    // Verify offline page content
    const title = await page.title();
    expect(title).toContain('Offline');

    const heading = await page.locator('h1').textContent();
    expect(heading).toContain('Offline');

    // Verify retry button exists
    const retryButton = page.locator('button.retry-btn');
    await expect(retryButton).toBeVisible();
  });

  test('should have description meta tag', async ({ page }) => {
    await page.goto('/');

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('softball');
    expect(description).toContain('Progressive Web App');
  });
});
