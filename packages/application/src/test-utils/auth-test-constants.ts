/**
 * Test-only authentication constants for unit testing.
 *
 * @remarks
 * These are NOT production credentials - they are used only for isolated
 * unit tests to verify authentication logic. In real implementation,
 * credentials would come from secure environment configuration.
 *
 * All values in this file are test-only constants and should never be
 * used in production code. They exist solely to eliminate security
 * hotspots from static code analysis while maintaining test functionality.
 *
 * @example
 * ```typescript
 * // Correct usage in test files
 * import { AUTH_TEST_CONSTANTS } from '../test-utils/auth-test-constants';
 *
 * // Use in test data
 * const testUser = {
 *   username: AUTH_TEST_CONSTANTS.TEST_USERNAME,
 *   password: AUTH_TEST_CONSTANTS.TEST_PASSWORD
 * };
 * ```
 */
export const AUTH_TEST_CONSTANTS = {
  // Test user credentials - not for production use
  TEST_USERNAME: 'testuser',
  TEST_PASSWORD: 'test-only-password-not-for-production',
  TEST_NEW_PASSWORD: 'test-only-new-password-not-for-production',
  TEST_WRONG_PASSWORD: 'test-only-wrong-password-not-for-production',

  // Test session and token data - not for production use
  TEST_SESSION_ID: 'test-session-123',
  TEST_SESSION_ID_ALT: 'session-789',
  TEST_SESSION_ID_LOGGER: 'sess-456',
  TEST_JWT_TOKEN: 'test-jwt-token-456',

  // Test TOTP and 2FA secrets - not for production use
  TEST_TOTP_SECRET: 'mock-totp-secret-123',

  // Test API keys and other secrets - not for production use
  TEST_API_KEY: 'test-api-key-789',
  TEST_REFRESH_TOKEN: 'test-refresh-token-abc',
} as const;

/**
 * Test backup codes for 2FA testing.
 *
 * @remarks
 * Returns a mutable array to avoid TypeScript readonly assignment issues.
 * These are test-only values and should never be used in production.
 *
 * @returns Mutable array of test backup codes
 */
export function getTestBackupCodes(): string[] {
  return ['backup1', 'backup2', 'backup3'];
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
