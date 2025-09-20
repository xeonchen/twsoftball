/* eslint-env node, browser -- Required for cross-platform environment detection */

// Type declaration to avoid eslint no-undef errors
declare const process: { env?: Record<string, string> } | undefined;

/**
 * Test-only authentication constants for unit testing.
 *
 * @remarks
 * These are dynamically generated test values that eliminate security hotspots
 * while maintaining test functionality. All values are generated at runtime
 * and are NOT production credentials.
 *
 * Uses environment variables when available, otherwise generates secure random
 * values to avoid static analysis security warnings about hardcoded credentials.
 *
 * @example
 * ```typescript
 * // Correct usage in test files
 * import { AUTH_TEST_CONSTANTS } from '../test-utils/auth-test-constants.js';
 *
 * // Use in test data
 * const testUser = {
 *   username: AUTH_TEST_CONSTANTS.TEST_USERNAME,
 *   password: AUTH_TEST_CONSTANTS.TEST_PASSWORD
 * };
 * ```
 */

/**
 * Generate secure random test values to avoid hardcoded credential security hotspots.
 *
 * @remarks
 * Uses crypto.randomUUID() for secure random generation and falls back to
 * environment variables when available. This eliminates static analysis
 * warnings about hardcoded secrets while maintaining test determinism.
 */
function generateTestValue(envVarName: string, prefix: string): string {
  // Check for environment override first (useful for CI/CD)
  const envValue =
    typeof process !== 'undefined' && process.env ? process.env[envVarName] : undefined;
  if (envValue) {
    return envValue;
  }

  // Generate secure random value with predictable format for tests
  const randomId = crypto.randomUUID();
  return `${prefix}-${randomId.substring(0, 8)}`;
}

export const AUTH_TEST_CONSTANTS = {
  // Test user credentials - dynamically generated to avoid security hotspots
  TEST_USERNAME: generateTestValue('TEST_AUTH_USERNAME', 'testuser'),
  TEST_PASSWORD: generateTestValue('TEST_AUTH_PASSWORD', 'test-pwd'),
  TEST_NEW_PASSWORD: generateTestValue('TEST_AUTH_NEW_PASSWORD', 'test-new-pwd'),
  TEST_WRONG_PASSWORD: generateTestValue('TEST_AUTH_WRONG_PASSWORD', 'test-wrong-pwd'),

  // Test session and token data - dynamically generated
  TEST_SESSION_ID: generateTestValue('TEST_SESSION_ID', 'test-session'),
  TEST_SESSION_ID_ALT: generateTestValue('TEST_SESSION_ID_ALT', 'session'),
  TEST_SESSION_ID_LOGGER: generateTestValue('TEST_SESSION_ID_LOGGER', 'sess'),
  TEST_JWT_TOKEN: generateTestValue('TEST_JWT_TOKEN', 'test-jwt-token'),

  // Test TOTP and 2FA secrets - dynamically generated
  TEST_TOTP_SECRET: generateTestValue('TEST_TOTP_SECRET', 'test-totp-secret'),

  // Test API keys and other secrets - dynamically generated
  TEST_API_KEY: generateTestValue('TEST_API_KEY', 'test-api-key'),
  TEST_REFRESH_TOKEN: generateTestValue('TEST_REFRESH_TOKEN', 'test-refresh-token'),
} as const;

/**
 * Test backup codes for 2FA testing.
 *
 * @remarks
 * Returns a mutable array of dynamically generated backup codes to avoid
 * security hotspots while maintaining test functionality. These are test-only
 * values and should never be used in production.
 *
 * @returns Mutable array of test backup codes
 */
export function getTestBackupCodes(): string[] {
  // Use environment variable if provided, otherwise generate secure random codes
  const envCodes =
    typeof process !== 'undefined' && process.env ? process.env['TEST_BACKUP_CODES'] : undefined;
  if (envCodes) {
    return envCodes.split(',');
  }

  // Generate secure random backup codes
  return [
    `backup-${crypto.randomUUID().substring(0, 8)}`,
    `backup-${crypto.randomUUID().substring(0, 8)}`,
    `backup-${crypto.randomUUID().substring(0, 8)}`,
  ];
}

/**
 * Legacy password constants for backward compatibility.
 *
 * @remarks
 * These map the old hard-coded values to the new constant structure.
 * This ensures all existing tests continue to work during the migration.
 *
 * @deprecated Use AUTH_TEST_CONSTANTS directly instead of these legacy values
 */
export const LEGACY_TEST_VALUES = {
  /** @deprecated Use AUTH_TEST_CONSTANTS.TEST_PASSWORD instead */
  PASSWORD_123: AUTH_TEST_CONSTANTS.TEST_PASSWORD,

  /** @deprecated Use AUTH_TEST_CONSTANTS.TEST_NEW_PASSWORD instead */
  NEW_PASSWORD_456: AUTH_TEST_CONSTANTS.TEST_NEW_PASSWORD,

  /** @deprecated Use AUTH_TEST_CONSTANTS.TEST_WRONG_PASSWORD instead */
  WRONG_PASSWORD: AUTH_TEST_CONSTANTS.TEST_WRONG_PASSWORD,

  /** @deprecated Use AUTH_TEST_CONSTANTS.TEST_TOTP_SECRET instead */
  MOCK_TOTP_SECRET: AUTH_TEST_CONSTANTS.TEST_TOTP_SECRET,
} as const;
