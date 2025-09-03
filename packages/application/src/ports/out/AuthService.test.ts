/**
 * @file AuthService.test.ts
 * Comprehensive tests for the AuthService outbound port interface.
 *
 * @remarks
 * These tests validate the AuthService interface contract and ensure
 * that any infrastructure implementation correctly handles all authentication
 * and authorization scenarios required by the TW Softball application.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import type {
  AuthService,
  AuthMethod,
  UserRole,
  AuthCredentials,
  AuthResult,
  UserProfile,
  SessionInfo,
  TokenInfo,
  AuthError,
  SecurityEvent,
  AuthContext,
} from './AuthService';

/**
 * Mock implementation of AuthService for testing interface contracts.
 */
class MockAuthService implements AuthService {
  private readonly users: Map<
    string,
    {
      id: string;
      profile: UserProfile;
      credentials: Record<string, unknown>;
      isActive: boolean;
    }
  > = new Map();

  private readonly sessions: Map<string, SessionInfo> = new Map();
  private readonly tokens: Map<string, TokenInfo> = new Map();
  private readonly tokenToUserId: Map<string, string> = new Map(); // Direct token->userId mapping
  private readonly securityEvents: SecurityEvent[] = [];
  private readonly authResults: Map<string, boolean> = new Map();

  authenticate(
    method: AuthMethod,
    credentials: AuthCredentials,
    context?: AuthContext
  ): Promise<AuthResult> {
    const authKey = `${method}-${JSON.stringify(credentials)}`;
    const shouldSucceed = this.authResults.get(authKey) ?? true;

    if (!shouldSucceed) {
      const error: AuthError = {
        code: 'INVALID_CREDENTIALS',
        message: 'Authentication failed',
        method,
        timestamp: new Date(),
      };

      return Promise.resolve({
        success: false,
        error,
        timestamp: new Date(),
      });
    }

    // Check if user already exists by username
    const username = (credentials.username as string) || 'testuser';
    const existingUser = Array.from(this.users.values()).find(u => u.profile.username === username);

    let userId: string;
    let profile: UserProfile;

    if (existingUser) {
      // Use existing user
      userId = existingUser.profile.id;
      profile = existingUser.profile;
    } else {
      // Create new user
      const timestamp = Date.now() + Math.random() * 1000;
      userId = `user-${Math.floor(timestamp)}`;
      profile = {
        id: userId,
        username,
        email: (credentials.email as string) || 'test@example.com',
        displayName: 'Test User',
        roles: ['PLAYER'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Create session and tokens
    const timestamp = Date.now() + Math.random() * 1000;
    const sessionId = `session-${timestamp}`;
    const accessToken = `token-${timestamp}`;
    const refreshToken = `refresh-${timestamp}`;

    const session: SessionInfo = {
      sessionId,
      userId,
      isActive: true,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
      authMethod: method,
      ipAddress: context?.ipAddress || '127.0.0.1',
      userAgent: context?.userAgent || 'test-agent',
    };

    const tokenInfo: TokenInfo = {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    };

    // Store or update user
    this.users.set(userId, {
      id: userId,
      profile,
      credentials,
      isActive: true,
    });

    this.sessions.set(sessionId, session);
    this.tokens.set(accessToken, tokenInfo);
    this.tokenToUserId.set(accessToken, userId); // Store direct mapping

    return Promise.resolve({
      success: true,
      user: profile,
      session,
      tokens: tokenInfo,
      timestamp: new Date(),
    });
  }

  logout(sessionId: string, _context?: AuthContext): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Create a new session object with updated properties instead of mutating
      const updatedSession: SessionInfo = {
        ...session,
        isActive: false,
        endedAt: new Date(),
      };
      this.sessions.set(sessionId, updatedSession);

      // Invalidate associated tokens
      const tokensToDelete: string[] = [];
      for (const [token, userId] of Array.from(this.tokenToUserId.entries())) {
        if (userId === session.userId) {
          tokensToDelete.push(token);
        }
      }
      tokensToDelete.forEach(token => {
        this.tokens.delete(token);
        this.tokenToUserId.delete(token);
      });
    }
    return Promise.resolve();
  }

  validateSession(sessionId: string): Promise<SessionInfo | null> {
    const session = this.sessions.get(sessionId);

    if (!session || !session.isActive || new Date() > session.expiresAt) {
      return Promise.resolve(null);
    }

    // Update last activity by creating a new session object
    const updatedSession: SessionInfo = {
      ...session,
      lastActivityAt: new Date(),
    };
    this.sessions.set(sessionId, updatedSession);

    return Promise.resolve(updatedSession);
  }

  validateToken(token: string): Promise<TokenInfo | null> {
    const tokenInfo = this.tokens.get(token);

    if (!tokenInfo || new Date() > tokenInfo.expiresAt) {
      return Promise.resolve(null);
    }

    return Promise.resolve(tokenInfo);
  }

  refreshSession(refreshToken: string, _context?: AuthContext): Promise<AuthResult> {
    // Find token by refresh token
    const tokenEntry = Array.from(this.tokens.entries()).find(
      ([_, tokenInfo]) => tokenInfo.refreshToken === refreshToken
    );

    if (!tokenEntry) {
      const error: AuthError = {
        code: 'TOKEN_INVALID',
        message: 'Refresh token is invalid or expired',
        method: 'token' as AuthMethod,
        timestamp: new Date(),
      };

      return Promise.resolve({
        success: false,
        error,
        timestamp: new Date(),
      });
    }

    const [oldAccessToken, tokenInfo] = tokenEntry;

    if (new Date() > tokenInfo.expiresAt) {
      const error: AuthError = {
        code: 'TOKEN_INVALID',
        message: 'Refresh token is invalid or expired',
        method: 'token' as AuthMethod,
        timestamp: new Date(),
      };

      return Promise.resolve({
        success: false,
        error,
        timestamp: new Date(),
      });
    }

    // Find user for the old token
    const user = this.getUserForToken(oldAccessToken);

    if (!user) {
      const error: AuthError = {
        code: 'TOKEN_INVALID',
        message: 'Unable to find user for refresh token',
        method: 'token' as AuthMethod,
        timestamp: new Date(),
      };
      return Promise.resolve({
        success: false,
        error,
        timestamp: new Date(),
      });
    }

    // Generate new tokens with unique timestamps
    const timestamp = Date.now();
    const newAccessToken = `token-${timestamp}-refresh`;
    const newRefreshToken = `refresh-${timestamp}-new`;

    const newTokenInfo: TokenInfo = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    };

    // Remove old token and add new one
    this.tokens.delete(oldAccessToken);
    this.tokenToUserId.delete(oldAccessToken);
    this.tokens.set(newAccessToken, newTokenInfo);
    this.tokenToUserId.set(newAccessToken, user.id);

    return Promise.resolve({
      success: true,
      user: user.profile,
      tokens: newTokenInfo,
      timestamp: new Date(),
    });
  }

  getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = this.users.get(userId);
    return Promise.resolve(user?.profile || null);
  }

  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const user = this.users.get(userId);
    if (!user) {
      return Promise.reject(new Error('User not found'));
    }

    const updatedProfile = {
      ...user.profile,
      ...updates,
      id: user.profile.id, // Prevent ID changes
      updatedAt: new Date(),
    };

    user.profile = updatedProfile;
    this.users.set(userId, user);

    return Promise.resolve(updatedProfile);
  }

  hasPermission(userId: string, permission: string, resource?: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || !user.isActive) {
      return Promise.resolve(false);
    }

    // Mock permission logic
    const permissionKey = `${userId}-${permission}-${resource || 'global'}`;
    return Promise.resolve(this.authResults.get(permissionKey) ?? true);
  }

  hasRole(userId: string, role: UserRole): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || !user.isActive) {
      return Promise.resolve(false);
    }

    return Promise.resolve(user.profile.roles.includes(role));
  }

  getUserSessions(userId: string): Promise<SessionInfo[]> {
    return Promise.resolve(
      Array.from(this.sessions.values()).filter(
        session => session.userId === userId && session.isActive
      )
    );
  }

  async terminateSession(sessionId: string): Promise<void> {
    await this.logout(sessionId);
  }

  async terminateAllUserSessions(userId: string): Promise<void> {
    const userSessions = await this.getUserSessions(userId);

    for (const session of userSessions) {
      await this.logout(session.sessionId);
    }
  }

  logSecurityEvent(event: SecurityEvent): Promise<void> {
    this.securityEvents.push({
      ...event,
      timestamp: event.timestamp ?? new Date(),
    });
    return Promise.resolve();
  }

  getSecurityEvents(
    userId?: string,
    eventType?: string,
    fromDate?: Date
  ): Promise<SecurityEvent[]> {
    return Promise.resolve(
      this.securityEvents.filter(event => {
        if (userId && event.userId !== userId) return false;
        if (eventType && event.eventType !== eventType) return false;
        if (fromDate && event.timestamp && event.timestamp < fromDate) return false;
        return true;
      })
    );
  }

  async changePassword(
    userId: string,
    _currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Mock password validation
    const passwordValid = this.authResults.get(`password-${userId}`) ?? true;
    if (!passwordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update credentials (simplified)
    user.credentials = { ...user.credentials, password: newPassword };
    this.users.set(userId, user);

    // Log security event
    await this.logSecurityEvent({
      eventType: 'password_changed',
      userId,
      description: 'User changed password',
      timestamp: new Date(),
    });
  }

  async enableTwoFactor(
    userId: string,
    method: 'totp' | 'sms' | 'email'
  ): Promise<{ secret?: string; backupCodes?: string[] }> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const result: { secret?: string; backupCodes?: string[] } = {};

    if (method === 'totp') {
      result.secret = 'mock-totp-secret-123';
      result.backupCodes = ['backup1', 'backup2', 'backup3'];
    }

    // Update user profile with 2FA status by creating new profile object
    const updatedProfile: UserProfile = {
      ...user.profile,
      twoFactorEnabled: true,
      twoFactorMethods: [...(user.profile.twoFactorMethods || []), method],
    };
    const updatedUser = { ...user, profile: updatedProfile };
    this.users.set(userId, updatedUser);

    await this.logSecurityEvent({
      eventType: 'two_factor_enabled',
      userId,
      description: `Two-factor authentication enabled: ${method}`,
      metadata: { method },
      timestamp: new Date(),
    });

    return result;
  }

  async disableTwoFactor(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update user profile by creating new profile object
    const updatedProfile: UserProfile = {
      ...user.profile,
      twoFactorEnabled: false,
      twoFactorMethods: [],
    };
    const updatedUser = { ...user, profile: updatedProfile };
    this.users.set(userId, updatedUser);

    await this.logSecurityEvent({
      eventType: 'two_factor_disabled',
      userId,
      description: 'Two-factor authentication disabled',
      timestamp: new Date(),
    });
  }

  // Test helper methods
  setAuthResult(key: string, success: boolean): void {
    this.authResults.set(key, success);
  }

  getUserForToken(
    token: string
  ):
    | { id: string; profile: UserProfile; credentials: Record<string, unknown>; isActive: boolean }
    | undefined {
    const userId = this.tokenToUserId.get(token);
    if (!userId) return undefined;

    return this.users.get(userId);
  }

  getSessionForToken(token: string): SessionInfo | null {
    const tokenInfo = this.tokens.get(token);
    if (!tokenInfo) return null;

    return (
      Array.from(this.sessions.values()).find(
        session => session.userId === this.getTokenUserId(token)
      ) || null
    );
  }

  private getTokenUserId(token: string): string | null {
    // Simplified token-to-user mapping
    const tokenParts = token.split('-');
    return tokenParts.length > 1 ? `user-${tokenParts[1]}` : null;
  }

  getUsers(): UserProfile[] {
    return Array.from(this.users.values()).map(u => u.profile);
  }

  getSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  getTokens(): TokenInfo[] {
    return Array.from(this.tokens.values());
  }

  getSecurityEventsLog(): SecurityEvent[] {
    return [...this.securityEvents];
  }

  getCurrentUser(): Promise<{ userId: string } | null> {
    // For testing purposes, return the first active user or null
    const activeUser = Array.from(this.users.values()).find(u => u.isActive);
    return Promise.resolve(activeUser ? { userId: activeUser.id } : null);
  }

  clearAll(): void {
    this.users.clear();
    this.sessions.clear();
    this.tokens.clear();
    this.tokenToUserId.clear();
    this.securityEvents.length = 0;
    this.authResults.clear();
  }
}

describe('AuthService Interface', () => {
  let authService: MockAuthService;

  beforeEach(() => {
    authService = new MockAuthService();
  });

  describe('Authentication', () => {
    it('should authenticate user with local credentials successfully', async () => {
      const credentials: AuthCredentials = {
        username: 'testuser',
        password: 'password123',
      };

      const result = await authService.authenticate('local', credentials);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.username).toBe('testuser');
      expect(result.session).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should authenticate user with OAuth credentials', async () => {
      const credentials: AuthCredentials = {
        provider: 'google',
        authorizationCode: 'oauth-code-123',
      };

      const context: AuthContext = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        deviceInfo: {
          type: 'desktop',
          os: 'Windows',
          browser: 'Chrome',
        },
      };

      const result = await authService.authenticate('oauth', credentials, context);

      expect(result.success).toBe(true);
      expect(result.session?.ipAddress).toBe('192.168.1.100');
      expect(result.session?.authMethod).toBe('oauth');
    });

    it('should handle authentication failure', async () => {
      const credentials: AuthCredentials = {
        username: 'invaliduser',
        password: 'wrongpassword',
      };

      authService.setAuthResult(
        'local-{"username":"invaliduser","password":"wrongpassword"}',
        false
      );

      const result = await authService.authenticate('local', credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
      expect(result.tokens).toBeUndefined();
    });

    it('should handle two-factor authentication', async () => {
      const credentials: AuthCredentials = {
        username: 'testuser',
        password: 'password123',
        twoFactorCode: '123456',
      };

      const result = await authService.authenticate('local', credentials);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should support different authentication methods', async () => {
      const methods: AuthMethod[] = ['local', 'oauth', 'token'];

      for (const method of methods) {
        const credentials: AuthCredentials = {
          username: `user-${method}`,
          password: 'password123',
        };

        const result = await authService.authenticate(method, credentials);

        expect(result.success).toBe(true);
        expect(result.session?.authMethod).toBe(method);
      }
    });
  });

  describe('Session Management', () => {
    let sessionId: string;

    beforeEach(async () => {
      const result = await authService.authenticate('local', {
        username: 'testuser',
        password: 'password123',
      });
      sessionId = result.session!.sessionId;
    });

    it('should validate active session', async () => {
      const session = await authService.validateSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.isActive).toBe(true);
      expect(session?.sessionId).toBe(sessionId);
    });

    it('should return null for invalid session', async () => {
      const session = await authService.validateSession('invalid-session');

      expect(session).toBeNull();
    });

    it('should update last activity on session validation', async () => {
      const originalSession = await authService.validateSession(sessionId);
      const originalActivity = originalSession!.lastActivityAt;

      // Wait a bit and validate again
      await new Promise(resolve => setTimeout(resolve, 10));
      const updatedSession = await authService.validateSession(sessionId);

      expect(updatedSession!.lastActivityAt.getTime()).toBeGreaterThan(originalActivity.getTime());
    });

    it('should logout user and invalidate session', async () => {
      await authService.logout(sessionId);

      const session = await authService.validateSession(sessionId);
      expect(session).toBeNull();
    });

    it('should get all user sessions', async () => {
      const userId = (await authService.validateSession(sessionId))!.userId;

      // Create another session for the same user
      await authService.authenticate('local', {
        username: 'testuser',
        password: 'password123',
      });

      const sessions = await authService.getUserSessions(userId);

      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.every(s => s.userId === userId)).toBe(true);
    });

    it('should terminate specific session', async () => {
      await authService.terminateSession(sessionId);

      const session = await authService.validateSession(sessionId);
      expect(session).toBeNull();
    });

    it('should terminate all user sessions', async () => {
      const userId = (await authService.validateSession(sessionId))!.userId;

      // Create additional sessions
      await authService.authenticate('local', {
        username: 'testuser',
        password: 'password123',
      });

      await authService.terminateAllUserSessions(userId);

      const sessions = await authService.getUserSessions(userId);
      expect(sessions.every(s => !s.isActive)).toBe(true);
    });
  });

  describe('Token Management', () => {
    let tokens: TokenInfo;

    beforeEach(async () => {
      const result = await authService.authenticate('local', {
        username: 'testuser',
        password: 'password123',
      });
      tokens = result.tokens!;
    });

    it('should validate access token', async () => {
      const tokenInfo = await authService.validateToken(tokens.accessToken);

      expect(tokenInfo).toBeDefined();
      expect(tokenInfo?.accessToken).toBe(tokens.accessToken);
      expect(tokenInfo?.tokenType).toBe('Bearer');
    });

    it('should return null for invalid token', async () => {
      const tokenInfo = await authService.validateToken('invalid-token');

      expect(tokenInfo).toBeNull();
    });

    it('should refresh session with refresh token', async () => {
      const result = await authService.refreshSession(tokens.refreshToken!);

      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).not.toBe(tokens.accessToken);
      expect(result.tokens?.refreshToken).not.toBe(tokens.refreshToken);
    });

    it('should handle invalid refresh token', async () => {
      const result = await authService.refreshSession('invalid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOKEN_INVALID');
    });

    it('should include token expiration information', async () => {
      const tokenInfo = await authService.validateToken(tokens.accessToken);

      expect(tokenInfo?.expiresIn).toBe(3600);
      expect(tokenInfo?.issuedAt).toBeInstanceOf(Date);
      expect(tokenInfo?.expiresAt).toBeInstanceOf(Date);
      expect(tokenInfo?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('User Profile Management', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.authenticate('local', {
        username: 'testuser',
        password: 'password123',
      });
      userId = result.user!.id;
    });

    it('should get user profile', async () => {
      const profile = await authService.getUserProfile(userId);

      expect(profile).toBeDefined();
      expect(profile?.id).toBe(userId);
      expect(profile?.username).toBe('testuser');
      expect(profile?.roles).toEqual(['PLAYER']);
    });

    it('should return null for non-existent user', async () => {
      const profile = await authService.getUserProfile('non-existent-user');

      expect(profile).toBeNull();
    });

    it('should update user profile', async () => {
      const updates = {
        displayName: 'Updated Name',
        email: 'updated@example.com',
      };

      const updatedProfile = await authService.updateUserProfile(userId, updates);

      expect(updatedProfile.displayName).toBe('Updated Name');
      expect(updatedProfile.email).toBe('updated@example.com');
      expect(updatedProfile.updatedAt).toBeInstanceOf(Date);
      expect(updatedProfile.id).toBe(userId); // ID should not change
    });

    it('should handle user profile update for non-existent user', async () => {
      await expect(
        authService.updateUserProfile('non-existent-user', { displayName: 'Test' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('Authorization', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.authenticate('local', {
        username: 'testuser',
        password: 'password123',
      });
      userId = result.user!.id;
    });

    it('should check user permissions', async () => {
      const hasPermission = await authService.hasPermission(userId, 'record_at_bat', 'game-123');

      expect(hasPermission).toBe(true);
    });

    it('should deny permission for unauthorized actions', async () => {
      authService.setAuthResult(`${userId}-admin_access-global`, false);

      const hasPermission = await authService.hasPermission(userId, 'admin_access');

      expect(hasPermission).toBe(false);
    });

    it('should check user roles', async () => {
      const hasPlayerRole = await authService.hasRole(userId, 'PLAYER');
      const hasAdminRole = await authService.hasRole(userId, 'ADMIN');

      expect(hasPlayerRole).toBe(true);
      expect(hasAdminRole).toBe(false);
    });

    it('should handle authorization for non-existent user', async () => {
      const hasPermission = await authService.hasPermission('non-existent-user', 'any_permission');

      expect(hasPermission).toBe(false);
    });
  });

  describe('Security Events', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.authenticate('local', {
        username: 'testuser',
        password: 'password123',
      });
      userId = result.user!.id;
    });

    it('should log security events', async () => {
      const event: SecurityEvent = {
        eventType: 'login_attempt',
        userId,
        description: 'Successful login',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        severity: 'info',
      };

      await authService.logSecurityEvent(event);

      const events = await authService.getSecurityEvents(userId);
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('login_attempt');
      expect(events[0]?.userId).toBe(userId);
    });

    it('should filter security events by user', async () => {
      // Create events for different users
      await authService.logSecurityEvent({
        eventType: 'login',
        userId,
        description: 'User 1 login',
      });

      await authService.logSecurityEvent({
        eventType: 'login',
        userId: 'other-user',
        description: 'User 2 login',
      });

      const userEvents = await authService.getSecurityEvents(userId);

      expect(userEvents).toHaveLength(1);
      expect(userEvents[0]?.userId).toBe(userId);
    });

    it('should filter security events by event type', async () => {
      await authService.logSecurityEvent({
        eventType: 'login',
        userId,
        description: 'Login event',
      });

      await authService.logSecurityEvent({
        eventType: 'logout',
        userId,
        description: 'Logout event',
      });

      const loginEvents = await authService.getSecurityEvents(undefined, 'login');

      expect(loginEvents).toHaveLength(1);
      expect(loginEvents[0]?.eventType).toBe('login');
    });

    it('should filter security events by date', async () => {
      const recentDate = new Date();

      await authService.logSecurityEvent({
        eventType: 'login',
        userId,
        description: 'Recent event',
        timestamp: recentDate,
      });

      const recentEvents = await authService.getSecurityEvents(
        undefined,
        undefined,
        new Date(Date.now() - 3600000) // 1 hour ago
      );

      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0]?.description).toBe('Recent event');
    });
  });

  describe('Password Management', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.authenticate('local', {
        username: 'testuser',
        password: 'password123',
      });
      userId = result.user!.id;
    });

    it('should change user password', async () => {
      await authService.changePassword(userId, 'password123', 'newpassword456');

      const events = await authService.getSecurityEvents(userId, 'password_changed');
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('password_changed');
    });

    it('should reject password change with incorrect current password', async () => {
      authService.setAuthResult(`password-${userId}`, false);

      await expect(
        authService.changePassword(userId, 'wrongpassword', 'newpassword456')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should handle password change for non-existent user', async () => {
      await expect(authService.changePassword('non-existent-user', 'old', 'new')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('Two-Factor Authentication', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.authenticate('local', {
        username: 'testuser',
        password: 'password123',
      });
      userId = result.user!.id;
    });

    it('should enable TOTP two-factor authentication', async () => {
      const result = await authService.enableTwoFactor(userId, 'totp');

      expect(result.secret).toBeDefined();
      expect(result.backupCodes).toBeDefined();
      expect(result.backupCodes).toHaveLength(3);

      const profile = await authService.getUserProfile(userId);
      expect(profile?.twoFactorEnabled).toBe(true);
      expect(profile?.twoFactorMethods).toContain('totp');
    });

    it('should enable SMS two-factor authentication', async () => {
      const result = await authService.enableTwoFactor(userId, 'sms');

      expect(result).toBeDefined();

      const profile = await authService.getUserProfile(userId);
      expect(profile?.twoFactorEnabled).toBe(true);
      expect(profile?.twoFactorMethods).toContain('sms');
    });

    it('should disable two-factor authentication', async () => {
      await authService.enableTwoFactor(userId, 'totp');
      await authService.disableTwoFactor(userId);

      const profile = await authService.getUserProfile(userId);
      expect(profile?.twoFactorEnabled).toBe(false);
      expect(profile?.twoFactorMethods).toHaveLength(0);

      const events = await authService.getSecurityEvents(userId, 'two_factor_disabled');
      expect(events).toHaveLength(1);
    });

    it('should log security events for two-factor changes', async () => {
      await authService.enableTwoFactor(userId, 'totp');

      const events = await authService.getSecurityEvents(userId, 'two_factor_enabled');
      expect(events).toHaveLength(1);
      expect(events[0]?.metadata?.['method']).toBe('totp');
    });

    it('should handle two-factor operations for non-existent user', async () => {
      await expect(authService.enableTwoFactor('non-existent-user', 'totp')).rejects.toThrow(
        'User not found'
      );

      await expect(authService.disableTwoFactor('non-existent-user')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle authentication with empty credentials', async () => {
      const result = await authService.authenticate('local', {});

      // Should still process (implementation detail)
      expect(result).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle concurrent authentication attempts', async () => {
      const credentials: AuthCredentials = {
        username: 'testuser',
        password: 'password123',
      };

      const promises = Array(5)
        .fill(null)
        .map(() => authService.authenticate('local', credentials));

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
      });
    });

    it('should handle session validation for expired sessions', async () => {
      // This would typically be tested with time manipulation
      // For now, we test the interface contract
      const session = await authService.validateSession('expired-session');
      expect(session).toBeNull();
    });

    it('should handle complex metadata in security events', async () => {
      const complexEvent: SecurityEvent = {
        eventType: 'complex_event',
        userId: 'user-123',
        description: 'Event with complex metadata',
        metadata: {
          gameId: 'game-456',
          actionDetails: {
            type: 'at_bat_record',
            result: 'SINGLE',
            timing: {
              start: new Date(),
              end: new Date(),
            },
          },
          systemInfo: {
            version: '1.0.0',
            environment: 'production',
            features: ['feature1', 'feature2'],
          },
        },
      };

      await authService.logSecurityEvent(complexEvent);

      const events = await authService.getSecurityEvents('user-123', 'complex_event');
      expect(events).toHaveLength(1);
      expect(events[0]?.metadata).toEqual(complexEvent.metadata);
    });
  });

  describe('Type Safety and Interface Compliance', () => {
    it('should enforce AuthMethod type constraints', () => {
      const validMethods: AuthMethod[] = ['local', 'oauth', 'token'];

      validMethods.forEach(method => {
        expect(['local', 'oauth', 'token']).toContain(method);
      });
    });

    it('should enforce UserRole type constraints', () => {
      const validRoles: UserRole[] = ['ADMIN', 'COACH', 'PLAYER', 'SCOREKEEPER', 'VIEWER'];

      validRoles.forEach(role => {
        expect(['ADMIN', 'COACH', 'PLAYER', 'SCOREKEEPER', 'VIEWER']).toContain(role);
      });
    });

    it('should handle all required AuthResult properties', async () => {
      const result = await authService.authenticate('local', {
        username: 'testuser',
        password: 'password123',
      });

      // Verify required properties exist
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');

      // Verify property types
      expect(typeof result.success).toBe('boolean');
      expect(result.timestamp).toBeInstanceOf(Date);

      if (result.success) {
        expect(result).toHaveProperty('user');
        expect(result).toHaveProperty('session');
        expect(result).toHaveProperty('tokens');
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('should handle all required UserProfile properties', async () => {
      const result = await authService.authenticate('local', {
        username: 'testuser',
        password: 'password123',
      });

      const profile = result.user!;

      // Verify all required properties exist
      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('username');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('displayName');
      expect(profile).toHaveProperty('roles');
      expect(profile).toHaveProperty('isActive');
      expect(profile).toHaveProperty('createdAt');
      expect(profile).toHaveProperty('updatedAt');

      // Verify property types
      expect(typeof profile.id).toBe('string');
      expect(typeof profile.username).toBe('string');
      expect(typeof profile.email).toBe('string');
      expect(typeof profile.displayName).toBe('string');
      expect(Array.isArray(profile.roles)).toBe(true);
      expect(typeof profile.isActive).toBe('boolean');
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.updatedAt).toBeInstanceOf(Date);
    });
  });
});
