/**
 * @file AuthService
 * Outbound port interface for authentication and authorization in the TW Softball application.
 *
 * @remarks
 * This interface defines the driven port for authentication and authorization operations
 * in the hexagonal architecture. It abstracts all security concerns from the application
 * core, enabling different authentication implementations without affecting business logic.
 *
 * The authentication service provides comprehensive security capabilities supporting:
 * - Multiple authentication methods (local, OAuth, token-based)
 * - Session management and lifecycle tracking
 * - Role-based access control (RBAC) with fine-grained permissions
 * - User profile management and customization
 * - Multi-factor authentication (MFA) support
 * - Security event logging and audit trails
 * - Password management and security policies
 *
 * Design principles:
 * - **Method-agnostic**: Supports various authentication strategies
 * - **Session-aware**: Complete session lifecycle management
 * - **Permission-based**: Fine-grained authorization control
 * - **Security-focused**: Comprehensive audit trails and monitoring
 * - **User-centric**: Rich profile management and customization
 * - **Future-proof**: Extensible for emerging authentication patterns
 *
 * The interface supports authentication for different user types in the softball application:
 * - **Players**: Game participation, statistics tracking, personal data
 * - **Coaches**: Team management, lineup control, strategic decisions
 * - **Scorekeepers**: Game recording, official scoring, result management
 * - **Admins**: System administration, user management, configuration
 * - **Viewers**: Read-only access for spectators and family members
 *
 * Security features include:
 * - Token-based authentication with refresh capabilities
 * - Session management with configurable expiration
 * - Multi-factor authentication support (TOTP, SMS, email)
 * - Comprehensive security event logging
 * - Password strength enforcement and rotation
 * - Account lockout and brute-force protection patterns
 *
 * @example
 * ```typescript
 * // Infrastructure implementation
 * class WebAuthService implements AuthService {
 *   private jwtService: JWTService;
 *   private userRepository: UserRepository;
 *   private sessionStore: SessionStore;
 *   private securityLogger: SecurityLogger;
 *
 *   async authenticate(
 *     method: AuthMethod,
 *     credentials: AuthCredentials,
 *     context?: AuthContext
 *   ): Promise<AuthResult> {
 *     const startTime = Date.now();
 *
 *     try {
 *       // Validate credentials based on method
 *       const user = await this.validateCredentials(method, credentials);
 *
 *       if (!user) {
 *         await this.logSecurityEvent({
 *           eventType: 'authentication_failed',
 *           description: 'Invalid credentials provided',
 *           ipAddress: context?.ipAddress,
 *           userAgent: context?.userAgent,
 *           severity: 'warning'
 *         });
 *
 *         return {
 *           success: false,
 *           error: {
 *             code: 'INVALID_CREDENTIALS',
 *             message: 'Authentication failed',
 *             method,
 *             timestamp: new Date()
 *           },
 *           timestamp: new Date()
 *         };
 *       }
 *
 *       // Create session and tokens
 *       const session = await this.createSession(user, method, context);
 *       const tokens = await this.generateTokens(user, session);
 *
 *       await this.logSecurityEvent({
 *         eventType: 'authentication_success',
 *         userId: user.id,
 *         description: 'User successfully authenticated',
 *         ipAddress: context?.ipAddress,
 *         userAgent: context?.userAgent,
 *         metadata: {
 *           method,
 *           sessionId: session.sessionId,
 *           duration: Date.now() - startTime
 *         }
 *       });
 *
 *       return {
 *         success: true,
 *         user,
 *         session,
 *         tokens,
 *         timestamp: new Date()
 *       };
 *     } catch (error) {
 *       await this.logSecurityEvent({
 *         eventType: 'authentication_error',
 *         description: 'Authentication process failed',
 *         ipAddress: context?.ipAddress,
 *         severity: 'error',
 *         metadata: { error: error.message }
 *       });
 *
 *       throw error;
 *     }
 *   }
 * }
 *
 * // Usage in application service
 * class UserAuthenticationService {
 *   constructor(
 *     private authService: AuthService,
 *     private notificationService: NotificationService,
 *     private logger: Logger
 *   ) {}
 *
 *   async loginUser(request: LoginRequest): Promise<LoginResponse> {
 *     const context: AuthContext = {
 *       ipAddress: request.ipAddress,
 *       userAgent: request.userAgent,
 *       deviceInfo: request.deviceInfo
 *     };
 *
 *     try {
 *       const result = await this.authService.authenticate(
 *         'local',
 *         { username: request.username, password: request.password },
 *         context
 *       );
 *
 *       if (result.success) {
 *         // Send welcome notification
 *         await this.notificationService.sendUserNotification(
 *           'info',
 *           'Welcome Back!',
 *           `Successfully logged in to TW Softball`,
 *           {
 *             loginTime: new Date(),
 *             deviceType: context.deviceInfo?.type,
 *             location: context.ipAddress
 *           },
 *           {
 *             source: 'authentication-service',
 *             userId: result.user!.id,
 *             priority: 'low'
 *           }
 *         );
 *
 *         return {
 *           success: true,
 *           user: result.user!,
 *           accessToken: result.tokens!.accessToken,
 *           refreshToken: result.tokens!.refreshToken,
 *           expiresIn: result.tokens!.expiresIn
 *         };
 *       } else {
 *         // Handle authentication failure
 *         this.logger.warn('User authentication failed', {
 *           username: request.username,
 *           error: result.error?.code,
 *           ipAddress: request.ipAddress
 *         });
 *
 *         return {
 *           success: false,
 *           error: result.error!.message
 *         };
 *       }
 *     } catch (error) {
 *       this.logger.error('Authentication service error', error, {
 *         username: request.username,
 *         operation: 'login'
 *       });
 *
 *       throw error;
 *     }
 *   }
 * }
 * ```
 */

/**
 * Supported authentication methods for flexible security strategies.
 *
 * @remarks
 * Authentication methods provide different security approaches suitable
 * for various deployment scenarios and user preferences. Each method
 * has different characteristics and requirements:
 *
 * - **local**: Username/password authentication with local storage
 * - **oauth**: OAuth 2.0/OpenID Connect with external providers (Google, Microsoft, etc.)
 * - **token**: Token-based authentication for API access and service integration
 *
 * Method selection depends on:
 * - Security requirements and compliance needs
 * - User experience preferences
 * - Integration with existing systems
 * - Technical infrastructure capabilities
 */
export type AuthMethod = 'local' | 'oauth' | 'token';

/**
 * User roles for role-based access control in the softball application.
 *
 * @remarks
 * Hierarchical role system that defines different levels of access and
 * functionality within the TW Softball application. Roles determine
 * available features, data access, and operational capabilities.
 *
 * Role hierarchy (highest to lowest privilege):
 * - **ADMIN**: System administration, user management, global configuration
 * - **COACH**: Team management, lineup control, strategic access
 * - **SCOREKEEPER**: Official scoring, game management, result recording
 * - **PLAYER**: Personal statistics, game participation, limited team data
 * - **VIEWER**: Read-only access, spectator features, basic game information
 *
 * Role-based permissions:
 * - Admins can access all system functions and manage users
 * - Coaches can manage their teams and access strategic information
 * - Scorekeepers can record official game data and manage game flow
 * - Players can track personal statistics and participate in games
 * - Viewers can observe games and access public information
 *
 * Multiple roles per user are supported for complex organizational structures
 * (e.g., a Coach who is also a Player on another team).
 */
export type UserRole = 'ADMIN' | 'COACH' | 'PLAYER' | 'SCOREKEEPER' | 'VIEWER';

/**
 * Flexible authentication credentials structure for different authentication methods.
 *
 * @remarks
 * AuthCredentials provides a flexible container for authentication data
 * that adapts to different authentication methods. The structure supports
 * traditional username/password, OAuth flows, token-based authentication,
 * and multi-factor authentication scenarios.
 *
 * Common credential patterns:
 * - **Local authentication**: username, password, optional 2FA code
 * - **OAuth authentication**: provider, authorization code, state parameter
 * - **Token authentication**: access token, optional refresh token
 * - **Multi-factor**: primary credentials plus verification codes
 *
 * The flexible structure allows for evolution and new authentication
 * methods without breaking interface contracts.
 *
 * @example
 * ```typescript
 * // Local authentication credentials
 * const localCreds: AuthCredentials = {
 *   username: 'player123',
 *   password: 'securePassword123',
 *   twoFactorCode: '123456' // Optional 2FA
 * };
 *
 * // OAuth authentication credentials
 * const oauthCreds: AuthCredentials = {
 *   provider: 'google',
 *   authorizationCode: 'oauth-code-from-provider',
 *   state: 'csrf-protection-token',
 *   redirectUri: 'https://app.twsoftball.com/auth/callback'
 * };
 *
 * // Token authentication credentials
 * const tokenCreds: AuthCredentials = {
 *   accessToken: 'bearer-token-string',
 *   tokenType: 'Bearer'
 * };
 *
 * // Advanced MFA credentials
 * const mfaCreds: AuthCredentials = {
 *   username: 'coach456',
 *   password: 'myPassword',
 *   twoFactorCode: '789012',
 *   backupCode: 'emergency-code-1' // Backup code if TOTP unavailable
 * };
 * ```
 */
export interface AuthCredentials {
  /** Username for local authentication */
  readonly username?: string;

  /** Password for local authentication */
  readonly password?: string;

  /** Two-factor authentication code (TOTP, SMS, etc.) */
  readonly twoFactorCode?: string;

  /** OAuth provider identifier (google, microsoft, etc.) */
  readonly provider?: string;

  /** OAuth authorization code from provider */
  readonly authorizationCode?: string;

  /** OAuth state parameter for CSRF protection */
  readonly state?: string;

  /** OAuth redirect URI for callback handling */
  readonly redirectUri?: string;

  /** Access token for token-based authentication */
  readonly accessToken?: string;

  /** Refresh token for token renewal */
  readonly refreshToken?: string;

  /** Token type specification (Bearer, etc.) */
  readonly tokenType?: string;

  /** Backup authentication code for emergency access */
  readonly backupCode?: string;

  /** Email address for authentication flows */
  readonly email?: string;

  /** Additional authentication data for extensibility */
  readonly [key: string]: unknown;
}

/**
 * Contextual information about the authentication attempt for security and audit purposes.
 *
 * @remarks
 * AuthContext provides environmental and technical information about
 * authentication attempts, supporting security monitoring, fraud detection,
 * and audit trail requirements. This data helps identify suspicious
 * activity and provides forensic information for security analysis.
 *
 * Context categories:
 * - **Network information**: IP address, geographical location
 * - **Device information**: Browser, operating system, device type
 * - **Session information**: User agent, request headers
 * - **Security information**: Risk scores, fraud detection data
 */
export interface AuthContext {
  /** Client IP address for geographical and security tracking */
  readonly ipAddress?: string;

  /** User agent string for browser and device identification */
  readonly userAgent?: string;

  /** Device information for security and UX optimization */
  readonly deviceInfo?: {
    /** Device type classification */
    readonly type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    /** Operating system identification */
    readonly os?: string;
    /** Browser identification */
    readonly browser?: string;
    /** Device fingerprint for security tracking */
    readonly fingerprint?: string;
  };

  /** Geographic location information */
  readonly location?: {
    /** Country code (ISO 3166-1 alpha-2) */
    readonly country?: string;
    /** Region or state code */
    readonly region?: string;
    /** City name */
    readonly city?: string;
    /** Timezone identifier */
    readonly timezone?: string;
  };

  /** Security and risk assessment data */
  readonly security?: {
    /** Risk score for fraud detection (0-100) */
    readonly riskScore?: number;
    /** Detected security threats or anomalies */
    readonly threats?: string[];
    /** Whether this is a trusted device */
    readonly trustedDevice?: boolean;
  };

  /** Additional contextual metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Authentication error information for detailed failure analysis and user feedback.
 *
 * @remarks
 * AuthError provides structured error information that supports both
 * technical debugging and user-friendly error messaging. Error codes
 * enable consistent error handling across different authentication
 * scenarios and implementations.
 *
 * Common error scenarios:
 * - Invalid credentials (wrong username/password)
 * - Account locked or disabled
 * - Multi-factor authentication failures
 * - Token expiration or validation errors
 * - OAuth provider errors and communication issues
 * - Network timeouts and infrastructure problems
 */
export interface AuthError {
  /** Standardized error code for programmatic handling */
  readonly code:
    | 'INVALID_CREDENTIALS'
    | 'ACCOUNT_LOCKED'
    | 'ACCOUNT_DISABLED'
    | 'TWO_FACTOR_REQUIRED'
    | 'TWO_FACTOR_INVALID'
    | 'TOKEN_EXPIRED'
    | 'TOKEN_INVALID'
    | 'OAUTH_ERROR'
    | 'NETWORK_ERROR'
    | 'SERVER_ERROR'
    | 'UNKNOWN_ERROR';

  /** Human-readable error message for user display */
  readonly message: string;

  /** Authentication method that generated this error */
  readonly method: AuthMethod;

  /** When the error occurred */
  readonly timestamp: Date;

  /** Additional error details for debugging */
  readonly details?: Record<string, unknown>;

  /** Suggested recovery actions for the user */
  readonly recoveryActions?: string[];

  /** Whether this error should be retried */
  readonly retryable?: boolean;
}

/**
 * Result of an authentication attempt with complete outcome information.
 *
 * @remarks
 * AuthResult provides comprehensive feedback about authentication attempts,
 * supporting both successful and failed scenarios. The structure enables
 * applications to handle authentication outcomes appropriately and provide
 * meaningful feedback to users.
 *
 * Successful authentication includes:
 * - Complete user profile information
 * - Active session details
 * - Access and refresh tokens
 * - Timing information for audit trails
 *
 * Failed authentication includes:
 * - Detailed error information
 * - Recovery guidance
 * - Security event correlation data
 */
export interface AuthResult {
  /** Whether authentication was successful */
  readonly success: boolean;

  /** Complete user profile (only present on successful authentication) */
  readonly user?: UserProfile;

  /** Active session information (only present on successful authentication) */
  readonly session?: SessionInfo;

  /** Access and refresh tokens (only present on successful authentication) */
  readonly tokens?: TokenInfo;

  /** Error details (only present on failed authentication) */
  readonly error?: AuthError;

  /** When the authentication attempt completed */
  readonly timestamp: Date;

  /** Additional result metadata for monitoring and debugging */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Complete user profile information for identity and personalization.
 *
 * @remarks
 * UserProfile represents the complete user identity within the TW Softball
 * application, including authentication data, authorization roles, and
 * personalization information. The profile supports both security operations
 * and user experience customization.
 *
 * Profile categories:
 * - **Identity**: Core user identification and contact information
 * - **Security**: Authentication settings, multi-factor configuration
 * - **Authorization**: Roles, permissions, access control
 * - **Personalization**: Display preferences, notification settings
 * - **Audit**: Creation, update, and activity tracking
 */
export interface UserProfile {
  /** Unique user identifier within the system */
  readonly id: string;

  /** Unique username for authentication and display */
  readonly username: string;

  /** Primary email address for communication and recovery */
  readonly email: string;

  /** Display name for user interface and social features */
  readonly displayName: string;

  /** User roles for role-based access control */
  readonly roles: UserRole[];

  /** Whether the user account is currently active */
  readonly isActive: boolean;

  /** When the user account was created */
  readonly createdAt: Date;

  /** When the user profile was last updated */
  readonly updatedAt: Date;

  /** Optional additional profile information */
  readonly firstName?: string;
  readonly lastName?: string;
  readonly avatar?: string;
  readonly phoneNumber?: string;
  readonly timezone?: string;
  readonly language?: string;

  /** Multi-factor authentication configuration */
  readonly twoFactorEnabled?: boolean;
  readonly twoFactorMethods?: ('totp' | 'sms' | 'email')[];

  /** Account security settings */
  readonly lastLoginAt?: Date;
  readonly passwordChangedAt?: Date;
  readonly accountLockedAt?: Date;
  readonly emailVerifiedAt?: Date;

  /** User preferences and customization */
  readonly preferences?: Record<string, unknown>;

  /** Additional user metadata for extensibility */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Active session information for session lifecycle management.
 *
 * @remarks
 * SessionInfo tracks active user sessions, supporting security monitoring,
 * concurrent session management, and user experience optimization. Session
 * data enables features like "other devices" display, security alerts for
 * new locations, and proper session termination.
 *
 * Session lifecycle:
 * - Creation during successful authentication
 * - Activity tracking during application usage
 * - Expiration management with configurable timeouts
 * - Termination on logout or security events
 */
export interface SessionInfo {
  /** Unique session identifier */
  readonly sessionId: string;

  /** User ID associated with this session */
  readonly userId: string;

  /** Whether the session is currently active */
  readonly isActive: boolean;

  /** When the session was created */
  readonly createdAt: Date;

  /** Last activity timestamp for idle detection */
  readonly lastActivityAt: Date;

  /** When the session expires */
  readonly expiresAt: Date;

  /** When the session was terminated (if applicable) */
  readonly endedAt?: Date;

  /** Authentication method used to create this session */
  readonly authMethod: AuthMethod;

  /** IP address where the session originated */
  readonly ipAddress: string;

  /** User agent of the client that created the session */
  readonly userAgent: string;

  /** Geographic location of session creation */
  readonly location?: {
    readonly country?: string;
    readonly region?: string;
    readonly city?: string;
  };

  /** Device information for session identification */
  readonly deviceInfo?: {
    readonly type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    readonly os?: string;
    readonly browser?: string;
  };

  /** Additional session metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Token information for API authentication and authorization.
 *
 * @remarks
 * TokenInfo manages access and refresh tokens for secure API communication.
 * Tokens enable stateless authentication, support token rotation for security,
 * and provide fine-grained access control for different API endpoints.
 *
 * Token management features:
 * - JWT-based access tokens with embedded claims
 * - Refresh tokens for seamless token rotation
 * - Configurable expiration times for different security needs
 * - Token revocation support for security incidents
 */
export interface TokenInfo {
  /** Primary access token for API authentication */
  readonly accessToken: string;

  /** Refresh token for obtaining new access tokens */
  readonly refreshToken?: string;

  /** Token type specification (usually 'Bearer') */
  readonly tokenType: string;

  /** Token lifetime in seconds */
  readonly expiresIn: number;

  /** When the token was issued */
  readonly issuedAt: Date;

  /** When the token expires */
  readonly expiresAt: Date;

  /** Token scope or permissions (if applicable) */
  readonly scope?: string[];

  /** Additional token metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Security event information for audit trails and monitoring.
 *
 * @remarks
 * SecurityEvent captures security-relevant activities for compliance,
 * monitoring, and incident response. Events provide a complete audit
 * trail of authentication, authorization, and security-related actions
 * within the application.
 *
 * Event categories:
 * - Authentication events (login, logout, failed attempts)
 * - Authorization events (permission grants, role changes)
 * - Security configuration (password changes, 2FA setup)
 * - Suspicious activity (unusual locations, multiple failures)
 * - Administrative actions (user management, system changes)
 */
export interface SecurityEvent {
  /** Type of security event for categorization */
  readonly eventType: string;

  /** User ID associated with this event (if applicable) */
  readonly userId?: string;

  /** Human-readable description of the event */
  readonly description: string;

  /** When the event occurred */
  readonly timestamp?: Date;

  /** Event severity level for alerting and filtering */
  readonly severity?: 'info' | 'warning' | 'error' | 'critical';

  /** IP address where the event originated */
  readonly ipAddress?: string;

  /** User agent of the client that triggered the event */
  readonly userAgent?: string;

  /** Geographic location of the event */
  readonly location?: {
    readonly country?: string;
    readonly region?: string;
    readonly city?: string;
  };

  /** Resource or object affected by this event */
  readonly resource?: string;

  /** Action performed that triggered this event */
  readonly action?: string;

  /** Result or outcome of the action */
  readonly result?: 'success' | 'failure' | 'blocked' | 'pending';

  /** Additional event metadata for context and analysis */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Authentication and authorization service interface for secure user management.
 *
 * @remarks
 * This interface provides comprehensive authentication and authorization capabilities
 * for the TW Softball application, supporting multiple authentication methods,
 * session management, role-based access control, and security monitoring.
 *
 * Design principles:
 * - **Security-first**: Comprehensive security controls and monitoring
 * - **Method-agnostic**: Supports various authentication strategies
 * - **Session-aware**: Complete session lifecycle management
 * - **Permission-based**: Fine-grained authorization control
 * - **Audit-ready**: Complete security event logging and tracking
 * - **User-friendly**: Rich profile management and customization
 *
 * The service handles authentication for different user types:
 *
 * **Authentication Methods**:
 * - Local username/password authentication with secure storage
 * - OAuth 2.0 integration with popular providers (Google, Microsoft)
 * - Token-based authentication for API access and service integration
 * - Multi-factor authentication with TOTP, SMS, and email options
 *
 * **Authorization Features**:
 * - Role-based access control with hierarchical permissions
 * - Resource-specific permission checking
 * - Dynamic permission evaluation with context awareness
 * - Administrative user and role management
 *
 * **Security Features**:
 * - Comprehensive security event logging and monitoring
 * - Session management with configurable expiration policies
 * - Password management with strength enforcement
 * - Account security features (lockout, suspicious activity detection)
 * - Multi-factor authentication configuration and management
 *
 * **User Management**:
 * - Complete user profile management and customization
 * - Preference storage and synchronization
 * - Account lifecycle management (creation, updates, deactivation)
 * - Cross-device session management and security
 *
 * All operations are asynchronous to support various authentication backends
 * and external services without blocking application flow. The interface
 * provides detailed result information for proper error handling and user feedback.
 */
export interface AuthService {
  /**
   * Authenticates a user using the specified method and credentials.
   *
   * @remarks
   * Primary authentication method that handles user login across different
   * authentication strategies. The method validates credentials, creates
   * secure sessions, generates access tokens, and logs security events
   * for complete audit trails.
   *
   * Authentication flow:
   * 1. **Credential validation**: Verify credentials using appropriate method
   * 2. **Security checks**: Account status, lockout, suspicious activity
   * 3. **Multi-factor authentication**: Additional verification if required
   * 4. **Session creation**: Establish secure session with proper expiration
   * 5. **Token generation**: Create access and refresh tokens
   * 6. **Audit logging**: Record successful or failed authentication attempts
   *
   * Supported authentication scenarios:
   * - **Standard login**: Username/password with optional 2FA
   * - **OAuth login**: Integration with external providers
   * - **Token authentication**: API access and service integration
   * - **Multi-factor authentication**: TOTP, SMS, email verification
   *
   * The method considers security context including IP address, device
   * information, and geographic location for fraud detection and security
   * monitoring. Suspicious activities are automatically logged and may
   * trigger additional security measures.
   *
   * @param method - Authentication method to use (local, oauth, token)
   * @param credentials - Authentication credentials appropriate for the method
   * @param context - Optional contextual information for security and audit
   * @returns Promise resolving to authentication result with user, session, and token information
   *
   * @example
   * ```typescript
   * // Standard username/password authentication
   * const loginResult = await authService.authenticate(
   *   'local',
   *   {
   *     username: 'player123',
   *     password: 'securePassword123'
   *   },
   *   {
   *     ipAddress: '192.168.1.100',
   *     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
   *     deviceInfo: {
   *       type: 'desktop',
   *       os: 'Windows',
   *       browser: 'Chrome'
   *     }
   *   }
   * );
   *
   * if (loginResult.success) {
   *   console.log('Login successful:', loginResult.user?.displayName);
   *   console.log('Session ID:', loginResult.session?.sessionId);
   *   console.log('Access Token:', loginResult.tokens?.accessToken);
   * } else {
   *   console.error('Login failed:', loginResult.error?.message);
   * }
   *
   * // OAuth authentication with Google
   * const oauthResult = await authService.authenticate(
   *   'oauth',
   *   {
   *     provider: 'google',
   *     authorizationCode: 'google-oauth-code-from-callback',
   *     state: 'csrf-protection-token',
   *     redirectUri: 'https://app.twsoftball.com/auth/callback'
   *   }
   * );
   *
   * // Multi-factor authentication
   * const mfaResult = await authService.authenticate(
   *   'local',
   *   {
   *     username: 'coach456',
   *     password: 'myPassword',
   *     twoFactorCode: '123456' // From authenticator app
   *   }
   * );
   *
   * // Token-based authentication for API access
   * const tokenResult = await authService.authenticate(
   *   'token',
   *   {
   *     accessToken: 'bearer-token-from-previous-login',
   *     tokenType: 'Bearer'
   *   }
   * );
   * ```
   */
  authenticate(
    method: AuthMethod,
    credentials: AuthCredentials,
    context?: AuthContext
  ): Promise<AuthResult>;

  /**
   * Logs out a user by terminating their session and invalidating tokens.
   *
   * @remarks
   * Secure logout operation that terminates user sessions, invalidates
   * associated tokens, and logs security events. The logout process ensures
   * complete session cleanup and prevents unauthorized access after logout.
   *
   * Logout operations:
   * 1. **Session termination**: Mark session as inactive and set end time
   * 2. **Token invalidation**: Revoke access and refresh tokens
   * 3. **Security logging**: Record logout event for audit trails
   * 4. **Cleanup**: Remove temporary data and clear security context
   *
   * The logout process supports both user-initiated logout and administrative
   * session termination for security incidents. Context information enables
   * tracking of logout sources and circumstances.
   *
   * @param sessionId - Session identifier to terminate
   * @param context - Optional contextual information for audit logging
   * @returns Promise that resolves when logout is complete
   *
   * @example
   * ```typescript
   * // Standard user logout
   * await authService.logout('session-123', {
   *   ipAddress: '192.168.1.100',
   *   userAgent: 'Mozilla/5.0...',
   *   metadata: { reason: 'user_initiated' }
   * });
   *
   * // Administrative logout for security reasons
   * await authService.logout('suspicious-session-456', {
   *   ipAddress: '10.0.0.1',
   *   metadata: {
   *     reason: 'security_incident',
   *     administrator: 'admin-789',
   *     suspiciousActivity: 'unusual_location'
   *   }
   * });
   *
   * // Automatic logout due to inactivity
   * await authService.logout('expired-session-789', {
   *   metadata: {
   *     reason: 'session_timeout',
   *     lastActivity: new Date('2024-06-15T10:30:00Z')
   *   }
   * });
   * ```
   */
  logout(sessionId: string, context?: AuthContext): Promise<void>;

  /**
   * Validates an active session and returns session information if valid.
   *
   * @remarks
   * Session validation method that checks session validity, updates activity
   * timestamps, and returns complete session information for authorization
   * and user experience purposes. This method is called frequently during
   * application usage to maintain session state.
   *
   * Validation checks:
   * 1. **Session existence**: Verify session exists in storage
   * 2. **Activity status**: Check if session is marked as active
   * 3. **Expiration**: Validate session hasn't exceeded timeout limits
   * 4. **Security checks**: Verify no security flags or lockouts
   * 5. **Activity update**: Update last activity timestamp for idle tracking
   *
   * The method returns null for invalid sessions, enabling applications
   * to redirect to authentication or handle session expiration gracefully.
   * Valid sessions include complete information for user identification
   * and context.
   *
   * @param sessionId - Session identifier to validate
   * @returns Promise resolving to session information or null if invalid
   *
   * @example
   * ```typescript
   * // Validate session for API request
   * const session = await authService.validateSession('session-123');
   *
   * if (session) {
   *   console.log('Session valid for user:', session.userId);
   *   console.log('Last activity:', session.lastActivityAt);
   *   console.log('Expires at:', session.expiresAt);
   *
   *   // Check if session is approaching expiration
   *   const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
   *   if (timeUntilExpiry < 300000) { // 5 minutes
   *     console.log('Session expiring soon, consider renewal');
   *   }
   * } else {
   *   console.log('Session invalid - redirect to login');
   *   // Redirect to authentication
   * }
   *
   * // Middleware pattern for session validation
   * const validateSessionMiddleware = async (req, res, next) => {
   *   const sessionId = req.headers['x-session-id'];
   *   const session = await authService.validateSession(sessionId);
   *
   *   if (!session) {
   *     return res.status(401).json({ error: 'Invalid session' });
   *   }
   *
   *   req.user = { userId: session.userId, sessionId: session.sessionId };
   *   next();
   * };
   *
   * // Session health monitoring
   * const monitorSessionHealth = async (sessionId: string) => {
   *   const session = await authService.validateSession(sessionId);
   *
   *   if (session) {
   *     const idleTime = Date.now() - session.lastActivityAt.getTime();
   *     const remainingTime = session.expiresAt.getTime() - Date.now();
   *
   *     return {
   *       isHealthy: true,
   *       idleMinutes: Math.floor(idleTime / 60000),
   *       remainingMinutes: Math.floor(remainingTime / 60000),
   *       needsWarning: remainingTime < 600000 // 10 minutes
   *     };
   *   }
   *
   *   return { isHealthy: false };
   * };
   * ```
   */
  validateSession(sessionId: string): Promise<SessionInfo | null>;

  /**
   * Validates an access token and returns token information if valid.
   *
   * @remarks
   * Token validation method for API authentication that verifies token
   * authenticity, checks expiration, and returns complete token information.
   * This method supports stateless authentication patterns and API security.
   *
   * Token validation process:
   * 1. **Format validation**: Verify token structure and encoding
   * 2. **Signature verification**: Validate cryptographic signature
   * 3. **Expiration check**: Ensure token hasn't expired
   * 4. **Revocation check**: Verify token hasn't been revoked
   * 5. **Scope validation**: Check token permissions and scope
   *
   * The method returns null for invalid tokens, enabling API endpoints
   * to reject unauthorized requests appropriately. Valid tokens include
   * complete information for authorization decisions.
   *
   * @param token - Access token to validate
   * @returns Promise resolving to token information or null if invalid
   *
   * @example
   * ```typescript
   * // API endpoint token validation
   * const tokenInfo = await authService.validateToken('bearer-token-string');
   *
   * if (tokenInfo) {
   *   console.log('Token valid, expires at:', tokenInfo.expiresAt);
   *   console.log('Token scope:', tokenInfo.scope);
   *
   *   // Check token expiration proximity
   *   const timeUntilExpiry = tokenInfo.expiresAt.getTime() - Date.now();
   *   if (timeUntilExpiry < 300000) { // 5 minutes
   *     console.log('Token expiring soon, client should refresh');
   *   }
   * } else {
   *   console.log('Invalid token - reject request');
   * }
   *
   * // Express middleware for token validation
   * const tokenValidationMiddleware = async (req, res, next) => {
   *   const authHeader = req.headers.authorization;
   *   if (!authHeader?.startsWith('Bearer ')) {
   *     return res.status(401).json({ error: 'Missing or invalid authorization header' });
   *   }
   *
   *   const token = authHeader.substring(7); // Remove 'Bearer ' prefix
   *   const tokenInfo = await authService.validateToken(token);
   *
   *   if (!tokenInfo) {
   *     return res.status(401).json({ error: 'Invalid or expired token' });
   *   }
   *
   *   req.tokenInfo = tokenInfo;
   *   next();
   * };
   *
   * // Token health check for proactive renewal
   * const checkTokenHealth = async (token: string) => {
   *   const tokenInfo = await authService.validateToken(token);
   *
   *   if (!tokenInfo) {
   *     return { status: 'invalid', action: 'reauthenticate' };
   *   }
   *
   *   const timeUntilExpiry = tokenInfo.expiresAt.getTime() - Date.now();
   *
   *   if (timeUntilExpiry < 300000) { // 5 minutes
   *     return { status: 'expiring', action: 'refresh' };
   *   }
   *
   *   return { status: 'healthy', timeRemaining: timeUntilExpiry };
   * };
   * ```
   */
  validateToken(token: string): Promise<TokenInfo | null>;

  /**
   * Refreshes an authentication session using a refresh token.
   *
   * @remarks
   * Token refresh method that generates new access tokens using valid
   * refresh tokens, enabling seamless authentication renewal without
   * requiring user re-authentication. This supports continuous user
   * sessions while maintaining security through token rotation.
   *
   * Refresh process:
   * 1. **Refresh token validation**: Verify refresh token is valid and not expired
   * 2. **User verification**: Ensure associated user account is still active
   * 3. **Token generation**: Create new access and refresh token pair
   * 4. **Old token invalidation**: Revoke previous tokens for security
   * 5. **Audit logging**: Record token refresh event
   *
   * The refresh operation maintains session continuity while implementing
   * token rotation security practices. Failed refresh attempts may indicate
   * security issues and are logged appropriately.
   *
   * @param refreshToken - Valid refresh token for session renewal
   * @param context - Optional contextual information for security monitoring
   * @returns Promise resolving to new authentication result with fresh tokens
   *
   * @example
   * ```typescript
   * // Automatic token refresh before expiration
   * const refreshResult = await authService.refreshSession('refresh-token-string', {
   *   ipAddress: '192.168.1.100',
   *   userAgent: 'Mozilla/5.0...',
   *   metadata: { trigger: 'automatic_renewal' }
   * });
   *
   * if (refreshResult.success) {
   *   console.log('Token refreshed successfully');
   *   console.log('New access token:', refreshResult.tokens?.accessToken);
   *   console.log('New refresh token:', refreshResult.tokens?.refreshToken);
   *
   *   // Update stored tokens
   *   localStorage.setItem('accessToken', refreshResult.tokens!.accessToken);
   *   localStorage.setItem('refreshToken', refreshResult.tokens!.refreshToken!);
   * } else {
   *   console.error('Token refresh failed:', refreshResult.error?.message);
   *   // Redirect to login
   * }
   *
   * // Proactive token refresh strategy
   * const manageTokenLifecycle = async (currentToken: string, refreshToken: string) => {
   *   const tokenInfo = await authService.validateToken(currentToken);
   *
   *   if (!tokenInfo) {
   *     // Token invalid, try refresh
   *     return await authService.refreshSession(refreshToken);
   *   }
   *
   *   const timeUntilExpiry = tokenInfo.expiresAt.getTime() - Date.now();
   *
   *   if (timeUntilExpiry < 900000) { // 15 minutes
   *     // Proactively refresh before expiration
   *     console.log('Proactively refreshing token');
   *     return await authService.refreshSession(refreshToken);
   *   }
   *
   *   return { success: true, tokens: { accessToken: currentToken } };
   * };
   *
   * // Retry logic for failed API calls
   * const apiCallWithTokenRefresh = async (url: string, token: string, refreshToken: string) => {
   *   try {
   *     const response = await fetch(url, {
   *       headers: { Authorization: `Bearer ${token}` }
   *     });
   *
   *     if (response.status === 401) {
   *       // Token expired, try refresh
   *       const refreshResult = await authService.refreshSession(refreshToken);
   *
   *       if (refreshResult.success) {
   *         // Retry with new token
   *         return await fetch(url, {
   *           headers: { Authorization: `Bearer ${refreshResult.tokens!.accessToken}` }
   *         });
   *       }
   *     }
   *
   *     return response;
   *   } catch (error) {
   *     console.error('API call failed:', error);
   *     throw error;
   *   }
   * };
   * ```
   */
  refreshSession(refreshToken: string, context?: AuthContext): Promise<AuthResult>;

  /**
   * Retrieves complete user profile information by user ID.
   *
   * @remarks
   * User profile retrieval method that returns complete user information
   * for identity display, personalization, and user management operations.
   * This method provides access to user data while respecting privacy
   * and access control requirements.
   *
   * Profile information includes:
   * - **Identity data**: Username, email, display name, contact information
   * - **Security settings**: Multi-factor authentication, password policies
   * - **Authorization data**: Roles, permissions, access levels
   * - **Personalization**: Preferences, settings, customization data
   * - **Audit information**: Creation dates, last login, activity tracking
   *
   * The method returns null for non-existent users, enabling applications
   * to handle missing user scenarios gracefully. Access control should
   * be implemented at the application layer to ensure users can only
   * access appropriate profile information.
   *
   * @param userId - Unique identifier for the user
   * @returns Promise resolving to user profile or null if not found
   *
   * @example
   * ```typescript
   * // Get user profile for display
   * const userProfile = await authService.getUserProfile('user-123');
   *
   * if (userProfile) {
   *   console.log('User:', userProfile.displayName);
   *   console.log('Email:', userProfile.email);
   *   console.log('Roles:', userProfile.roles.join(', '));
   *   console.log('Last login:', userProfile.lastLoginAt);
   *   console.log('2FA enabled:', userProfile.twoFactorEnabled);
   * } else {
   *   console.log('User not found');
   * }
   *
   * // User dashboard data preparation
   * const prepareDashboardData = async (userId: string) => {
   *   const profile = await authService.getUserProfile(userId);
   *
   *   if (!profile) {
   *     throw new Error('User profile not found');
   *   }
   *
   *   return {
   *     displayName: profile.displayName,
   *     avatar: profile.avatar || '/default-avatar.png',
   *     roles: profile.roles,
   *     isAdmin: profile.roles.includes('ADMIN'),
   *     isCoach: profile.roles.includes('COACH'),
   *     preferences: profile.preferences || {},
   *     securityInfo: {
   *       twoFactorEnabled: profile.twoFactorEnabled || false,
   *       lastLogin: profile.lastLoginAt,
   *       emailVerified: !!profile.emailVerifiedAt
   *     }
   *   };
   * };
   *
   * // Profile privacy filter for different access levels
   * const getFilteredProfile = async (userId: string, requesterId: string) => {
   *   const profile = await authService.getUserProfile(userId);
   *
   *   if (!profile) return null;
   *
   *   // Full access for self
   *   if (userId === requesterId) {
   *     return profile;
   *   }
   *
   *   // Check if requester is admin
   *   const requesterProfile = await authService.getUserProfile(requesterId);
   *   const isAdmin = requesterProfile?.roles.includes('ADMIN') || false;
   *
   *   if (isAdmin) {
   *     return profile; // Admins see full profiles
   *   }
   *
   *   // Limited public profile for others
   *   return {
   *     id: profile.id,
   *     username: profile.username,
   *     displayName: profile.displayName,
   *     avatar: profile.avatar,
   *     roles: profile.roles.filter(role => role !== 'ADMIN'), // Hide admin role
   *     isActive: profile.isActive
   *   };
   * };
   * ```
   */
  getUserProfile(userId: string): Promise<UserProfile | null>;

  /**
   * Updates user profile information with the provided changes.
   *
   * @remarks
   * User profile update method that applies partial updates to user
   * information while maintaining data integrity and audit trails.
   * The method supports incremental updates without requiring
   * complete profile replacement.
   *
   * Update capabilities:
   * - **Basic information**: Display name, contact details, preferences
   * - **Security settings**: Password policies, notification preferences
   * - **Personalization**: UI preferences, timezone, language settings
   * - **Administrative**: Role changes, account status updates (with appropriate permissions)
   *
   * The method preserves critical fields like user ID and creation date,
   * and automatically updates the `updatedAt` timestamp. Validation
   * should be implemented to ensure data integrity and business rules.
   *
   * @param userId - Unique identifier for the user to update
   * @param updates - Partial profile updates to apply
   * @returns Promise resolving to updated complete user profile
   *
   * @example
   * ```typescript
   * // Update basic profile information
   * const updatedProfile = await authService.updateUserProfile('user-123', {
   *   displayName: 'John "Slugger" Smith',
   *   phoneNumber: '+1-555-0123',
   *   timezone: 'America/New_York',
   *   preferences: {
   *     theme: 'dark',
   *     notifications: {
   *       email: true,
   *       push: false
   *     }
   *   }
   * });
   *
   * console.log('Profile updated:', updatedProfile.displayName);
   * console.log('Updated at:', updatedProfile.updatedAt);
   *
   * // Administrative role update
   * await authService.updateUserProfile('user-456', {
   *   roles: ['PLAYER', 'COACH'], // Add coach role
   *   metadata: {
   *     roleChangedBy: 'admin-789',
   *     roleChangeReason: 'promoted_to_assistant_coach'
   *   }
   * });
   *
   * // Batch profile preferences update
   * const updateUserPreferences = async (userId: string, newPreferences: Record<string, unknown>) => {
   *   const currentProfile = await authService.getUserProfile(userId);
   *
   *   if (!currentProfile) {
   *     throw new Error('User not found');
   *   }
   *
   *   const updatedPreferences = {
   *     ...currentProfile.preferences,
   *     ...newPreferences
   *   };
   *
   *   return await authService.updateUserProfile(userId, {
   *     preferences: updatedPreferences
   *   });
   * };
   *
   * // Profile validation and update
   * const validateAndUpdateProfile = async (userId: string, updates: Partial<UserProfile>) => {
   *   // Validate email format if being updated
   *   if (updates.email && !isValidEmail(updates.email)) {
   *     throw new Error('Invalid email format');
   *   }
   *
   *   // Validate phone number format if being updated
   *   if (updates.phoneNumber && !isValidPhone(updates.phoneNumber)) {
   *     throw new Error('Invalid phone number format');
   *   }
   *
   *   // Apply updates
   *   const updatedProfile = await authService.updateUserProfile(userId, updates);
   *
   *   // Log profile change for audit
   *   await authService.logSecurityEvent({
   *     eventType: 'profile_updated',
   *     userId,
   *     description: 'User profile information updated',
   *     metadata: {
   *       updatedFields: Object.keys(updates),
   *       timestamp: new Date()
   *     }
   *   });
   *
   *   return updatedProfile;
   * };
   * ```
   */
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;

  /**
   * Checks if a user has a specific permission for a given resource.
   *
   * @remarks
   * Fine-grained permission checking method that evaluates user authorization
   * for specific actions and resources. This method supports role-based
   * access control (RBAC) and resource-specific permissions for secure
   * application functionality.
   *
   * Permission evaluation considers:
   * - **User roles**: Hierarchical role-based permissions
   * - **Direct permissions**: User-specific permission grants
   * - **Resource context**: Permissions specific to particular resources
   * - **Dynamic rules**: Context-sensitive permission logic
   * - **Account status**: Active user and account standing
   *
   * The method enables applications to implement security policies
   * consistently across different features and user interfaces.
   * Resource-specific permissions support multi-tenancy and
   * fine-grained access control scenarios.
   *
   * @param userId - User to check permissions for
   * @param permission - Permission identifier to check
   * @param resource - Optional resource identifier for resource-specific permissions
   * @returns Promise resolving to true if user has permission, false otherwise
   *
   * @example
   * ```typescript
   * // Check basic game recording permission
   * const canRecord = await authService.hasPermission('user-123', 'record_at_bat');
   *
   * if (canRecord) {
   *   console.log('User can record at-bats');
   * } else {
   *   console.log('User lacks recording permission');
   * }
   *
   * // Check game-specific permissions
   * const canManageGame = await authService.hasPermission(
   *   'coach-456',
   *   'manage_lineup',
   *   'game-789'
   * );
   *
   * if (canManageGame) {
   *   // Allow lineup management for this specific game
   * }
   *
   * // Permission-based UI rendering
   * const renderGameControls = async (userId: string, gameId: string) => {
   *   const permissions = await Promise.all([
   *     authService.hasPermission(userId, 'record_at_bat', gameId),
   *     authService.hasPermission(userId, 'manage_lineup', gameId),
   *     authService.hasPermission(userId, 'end_game', gameId),
   *     authService.hasPermission(userId, 'view_statistics', gameId)
   *   ]);
   *
   *   const [canRecord, canManage, canEnd, canViewStats] = permissions;
   *
   *   return {
   *     showRecordingControls: canRecord,
   *     showLineupManagement: canManage,
   *     showEndGameButton: canEnd,
   *     showStatistics: canViewStats
   *   };
   * };
   *
   * // Administrative permission checking
   * const checkAdminAccess = async (userId: string, operation: string) => {
   *   const hasGeneralAdmin = await authService.hasPermission(userId, 'admin_access');
   *
   *   if (hasGeneralAdmin) {
   *     return true; // Admin can do everything
   *   }
   *
   *   // Check specific administrative permissions
   *   switch (operation) {
   *     case 'manage_users':
   *       return await authService.hasPermission(userId, 'user_management');
   *     case 'system_config':
   *       return await authService.hasPermission(userId, 'system_configuration');
   *     case 'view_logs':
   *       return await authService.hasPermission(userId, 'security_monitoring');
   *     default:
   *       return false;
   *   }
   * };
   *
   * // Resource ownership permissions
   * const canAccessResource = async (userId: string, resourceType: string, resourceId: string) => {
   *   // Check general permission first
   *   const hasGeneralAccess = await authService.hasPermission(
   *     userId,
   *     `access_${resourceType}`
   *   );
   *
   *   if (hasGeneralAccess) {
   *     return true;
   *   }
   *
   *   // Check resource-specific permission
   *   return await authService.hasPermission(
   *     userId,
   *     `access_${resourceType}`,
   *     resourceId
   *   );
   * };
   * ```
   */
  hasPermission(userId: string, permission: string, resource?: string): Promise<boolean>;

  /**
   * Checks if a user has a specific role.
   *
   * @remarks
   * Role-based authorization method that verifies user role assignments
   * for access control decisions. This method supports hierarchical role
   * systems and multi-role user assignments common in complex applications.
   *
   * Role checking considers:
   * - **Direct role assignment**: User explicitly assigned to role
   * - **Role hierarchy**: Inherited permissions from higher roles
   * - **Active status**: User account must be active for role validity
   * - **Context sensitivity**: Roles may be context or resource specific
   *
   * The method enables role-based user interface customization,
   * feature availability, and access control throughout the application.
   * Multiple roles per user support complex organizational structures.
   *
   * @param userId - User to check role for
   * @param role - Role to verify assignment
   * @returns Promise resolving to true if user has role, false otherwise
   *
   * @example
   * ```typescript
   * // Check if user is an admin
   * const isAdmin = await authService.hasRole('user-123', 'ADMIN');
   *
   * if (isAdmin) {
   *   console.log('User has administrative privileges');
   * }
   *
   * // Check multiple roles for feature access
   * const canManageTeam = await Promise.all([
   *   authService.hasRole('user-456', 'COACH'),
   *   authService.hasRole('user-456', 'ADMIN')
   * ]);
   *
   * if (canManageTeam.some(Boolean)) {
   *   console.log('User can manage team (Coach or Admin)');
   * }
   *
   * // Role-based navigation menu
   * const buildNavigationMenu = async (userId: string) => {
   *   const roles = await Promise.all([
   *     authService.hasRole(userId, 'ADMIN'),
   *     authService.hasRole(userId, 'COACH'),
   *     authService.hasRole(userId, 'SCOREKEEPER'),
   *     authService.hasRole(userId, 'PLAYER'),
   *     authService.hasRole(userId, 'VIEWER')
   *   ]);
   *
   *   const [isAdmin, isCoach, isScorekeeper, isPlayer, isViewer] = roles;
   *
   *   const menuItems = [];
   *
   *   if (isPlayer || isCoach) {
   *     menuItems.push({ id: 'my-stats', label: 'My Statistics', path: '/stats' });
   *   }
   *
   *   if (isCoach || isAdmin) {
   *     menuItems.push({ id: 'team-mgmt', label: 'Team Management', path: '/team' });
   *   }
   *
   *   if (isScorekeeper || isCoach || isAdmin) {
   *     menuItems.push({ id: 'scoring', label: 'Score Game', path: '/score' });
   *   }
   *
   *   if (isAdmin) {
   *     menuItems.push({ id: 'admin', label: 'Administration', path: '/admin' });
   *   }
   *
   *   return menuItems;
   * };
   *
   * // Role-based feature availability
   * const getFeatureAvailability = async (userId: string) => {
   *   const profile = await authService.getUserProfile(userId);
   *
   *   if (!profile || !profile.isActive) {
   *     return { canAccessAnyFeatures: false };
   *   }
   *
   *   const features = {
   *     canViewGames: true, // All users can view
   *     canPlayGames: profile.roles.includes('PLAYER'),
   *     canCoachTeam: profile.roles.includes('COACH') || profile.roles.includes('ADMIN'),
   *     canScoreGames: profile.roles.includes('SCOREKEEPER') ||
   *                    profile.roles.includes('COACH') ||
   *                    profile.roles.includes('ADMIN'),
   *     canAdminister: profile.roles.includes('ADMIN'),
   *     canManageUsers: profile.roles.includes('ADMIN'),
   *     canViewReports: profile.roles.includes('ADMIN') ||
   *                     profile.roles.includes('COACH') ||
   *                     profile.roles.includes('SCOREKEEPER')
   *   };
   *
   *   return { canAccessAnyFeatures: true, ...features };
   * };
   * ```
   */
  hasRole(userId: string, role: UserRole): Promise<boolean>;

  /**
   * Retrieves all active sessions for a specific user.
   *
   * @remarks
   * Session management method that returns all active sessions associated
   * with a user account. This enables security monitoring, multi-device
   * session management, and "other devices" functionality for users.
   *
   * Session information includes:
   * - **Device details**: Browser, operating system, device type
   * - **Location information**: IP address, geographic location
   * - **Activity data**: Creation time, last activity, expiration
   * - **Authentication context**: Login method, security flags
   *
   * This method supports security features like:
   * - Device management and recognition
   * - Suspicious activity detection
   * - Remote session termination
   * - Login history and audit trails
   *
   * @param userId - User to retrieve sessions for
   * @returns Promise resolving to array of active sessions for the user
   *
   * @example
   * ```typescript
   * // Get all user sessions for security dashboard
   * const userSessions = await authService.getUserSessions('user-123');
   *
   * console.log(`User has ${userSessions.length} active sessions:`);
   * userSessions.forEach(session => {
   *   console.log(`- ${session.deviceInfo?.type} (${session.deviceInfo?.browser})`);
   *   console.log(`  Location: ${session.location?.city}, ${session.location?.country}`);
   *   console.log(`  Last active: ${session.lastActivityAt}`);
   *   console.log(`  Expires: ${session.expiresAt}`);
   * });
   *
   * // Security monitoring for unusual sessions
   * const checkSessionSecurity = async (userId: string) => {
   *   const sessions = await authService.getUserSessions(userId);
   *   const securityIssues = [];
   *
   *   // Check for sessions from multiple countries
   *   const countries = new Set(sessions.map(s => s.location?.country).filter(Boolean));
   *   if (countries.size > 1) {
   *     securityIssues.push('Sessions from multiple countries detected');
   *   }
   *
   *   // Check for very old sessions
   *   const oldSessions = sessions.filter(s => {
   *     const daysSinceActivity = (Date.now() - s.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);
   *     return daysSinceActivity > 30;
   *   });
   *
   *   if (oldSessions.length > 0) {
   *     securityIssues.push(`${oldSessions.length} sessions inactive for over 30 days`);
   *   }
   *
   *   // Check for too many concurrent sessions
   *   if (sessions.length > 5) {
   *     securityIssues.push('High number of concurrent sessions');
   *   }
   *
   *   return {
   *     sessionCount: sessions.length,
   *     securityIssues,
   *     needsReview: securityIssues.length > 0
   *   };
   * };
   *
   * // User-friendly session display
   * const formatSessionsForDisplay = async (userId: string) => {
   *   const sessions = await authService.getUserSessions(userId);
   *
   *   return sessions.map(session => ({
   *     id: session.sessionId,
   *     device: `${session.deviceInfo?.browser || 'Unknown Browser'} on ${session.deviceInfo?.os || 'Unknown OS'}`,
   *     location: session.location ? `${session.location.city}, ${session.location.country}` : 'Unknown Location',
   *     lastActive: session.lastActivityAt.toLocaleDateString(),
   *     current: session.sessionId === getCurrentSessionId(), // Helper to identify current session
   *     expiresIn: Math.ceil((session.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), // Days until expiry
   *   }));
   * };
   *
   * // Session cleanup recommendations
   * const getSessionCleanupRecommendations = async (userId: string) => {
   *   const sessions = await authService.getUserSessions(userId);
   *   const recommendations = [];
   *
   *   // Find inactive sessions
   *   const inactiveSessions = sessions.filter(s => {
   *     const hoursSinceActivity = (Date.now() - s.lastActivityAt.getTime()) / (1000 * 60 * 60);
   *     return hoursSinceActivity > 168; // 7 days
   *   });
   *
   *   if (inactiveSessions.length > 0) {
   *     recommendations.push({
   *       type: 'cleanup_inactive',
   *       message: `Consider terminating ${inactiveSessions.length} inactive sessions`,
   *       sessionIds: inactiveSessions.map(s => s.sessionId)
   *     });
   *   }
   *
   *   // Find duplicate device sessions
   *   const deviceGroups = sessions.reduce((groups, session) => {
   *     const key = `${session.deviceInfo?.type}-${session.ipAddress}`;
   *     if (!groups[key]) groups[key] = [];
   *     groups[key].push(session);
   *     return groups;
   *   }, {});
   *
   *   Object.entries(deviceGroups).forEach(([device, sessions]) => {
   *     if (sessions.length > 1) {
   *       recommendations.push({
   *         type: 'duplicate_device',
   *         message: `Multiple sessions from same device: ${device}`,
   *         sessionIds: sessions.map(s => s.sessionId)
   *       });
   *     }
   *   });
   *
   *   return recommendations;
   * };
   * ```
   */
  getUserSessions(userId: string): Promise<SessionInfo[]>;

  /**
   * Terminates a specific session by session ID.
   *
   * @remarks
   * Targeted session termination method for security management and
   * user device control. This method allows termination of specific
   * sessions while preserving others, supporting scenarios like
   * remote device logout or suspicious activity response.
   *
   * Termination process:
   * 1. **Session invalidation**: Mark session as inactive
   * 2. **Token revocation**: Invalidate associated access and refresh tokens
   * 3. **Security logging**: Record session termination event
   * 4. **Cleanup**: Remove temporary session data and context
   *
   * This method is commonly used for:
   * - User-initiated remote logout ("Log out other devices")
   * - Administrative security responses
   * - Automated security policy enforcement
   * - Session hygiene and lifecycle management
   *
   * @param sessionId - Session identifier to terminate
   * @returns Promise that resolves when session is terminated
   *
   * @example
   * ```typescript
   * // User-initiated remote logout
   * await authService.terminateSession('suspicious-session-456');
   * console.log('Remote session terminated');
   *
   * // Administrative session termination
   * const terminateUserSessionsFromCountry = async (userId: string, country: string) => {
   *   const sessions = await authService.getUserSessions(userId);
   *   const targetSessions = sessions.filter(s => s.location?.country === country);
   *
   *   for (const session of targetSessions) {
   *     await authService.terminateSession(session.sessionId);
   *
   *     // Log administrative action
   *     await authService.logSecurityEvent({
   *       eventType: 'admin_session_termination',
   *       userId,
   *       description: `Session terminated by admin due to geographic restriction`,
   *       metadata: {
   *         terminatedSessionId: session.sessionId,
   *         reason: 'geographic_restriction',
   *         country
   *       }
   *     });
   *   }
   *
   *   return targetSessions.length;
   * };
   *
   * // Security incident response
   * const respondToSecurityIncident = async (userId: string, incidentType: string) => {
   *   const sessions = await authService.getUserSessions(userId);
   *
   *   // Terminate all sessions except the current one
   *   const currentSessionId = getCurrentSessionId(); // Helper function
   *
   *   for (const session of sessions) {
   *     if (session.sessionId !== currentSessionId) {
   *       await authService.terminateSession(session.sessionId);
   *     }
   *   }
   *
   *   // Log security response
   *   await authService.logSecurityEvent({
   *     eventType: 'security_incident_response',
   *     userId,
   *     description: `All sessions terminated except current due to security incident`,
   *     severity: 'warning',
   *     metadata: {
   *       incidentType,
   *       terminatedSessions: sessions.length - 1,
   *       preservedSession: currentSessionId
   *     }
   *   });
   * };
   *
   * // Automated session cleanup
   * const cleanupStaleSessions = async (userId: string, maxInactiveHours: number = 168) => {
   *   const sessions = await authService.getUserSessions(userId);
   *   const cutoffTime = Date.now() - (maxInactiveHours * 60 * 60 * 1000);
   *
   *   const staleSessions = sessions.filter(s =>
   *     s.lastActivityAt.getTime() < cutoffTime
   *   );
   *
   *   for (const session of staleSessions) {
   *     await authService.terminateSession(session.sessionId);
   *   }
   *
   *   if (staleSessions.length > 0) {
   *     await authService.logSecurityEvent({
   *       eventType: 'automated_session_cleanup',
   *       userId,
   *       description: `${staleSessions.length} stale sessions automatically terminated`,
   *       metadata: {
   *         maxInactiveHours,
   *         cleanedSessions: staleSessions.length
   *       }
   *     });
   *   }
   *
   *   return staleSessions.length;
   * };
   * ```
   */
  terminateSession(sessionId: string): Promise<void>;

  /**
   * Terminates all active sessions for a specific user.
   *
   * @remarks
   * Mass session termination method for comprehensive security responses
   * and user account management. This method terminates all active sessions
   * for a user, commonly used in security incidents, password changes,
   * or user-requested "log out everywhere" operations.
   *
   * Mass termination process:
   * 1. **Session enumeration**: Identify all active user sessions
   * 2. **Bulk invalidation**: Mark all sessions as inactive simultaneously
   * 3. **Token revocation**: Invalidate all associated tokens
   * 4. **Security logging**: Record mass termination event
   * 5. **Notification**: Alert user of global logout (optional)
   *
   * This method is essential for:
   * - Security incident response
   * - Password change enforcement
   * - Account compromise remediation
   * - User privacy control ("log out everywhere")
   *
   * @param userId - User to terminate all sessions for
   * @returns Promise that resolves when all sessions are terminated
   *
   * @example
   * ```typescript
   * // User-requested "log out everywhere"
   * await authService.terminateAllUserSessions('user-123');
   * console.log('All user sessions terminated');
   *
   * // Security incident response
   * const handleCompromiseResponse = async (userId: string, incidentDetails: any) => {
   *   // Immediately terminate all sessions
   *   await authService.terminateAllUserSessions(userId);
   *
   *   // Log security incident
   *   await authService.logSecurityEvent({
   *     eventType: 'account_compromise_response',
   *     userId,
   *     description: 'All sessions terminated due to suspected account compromise',
   *     severity: 'critical',
   *     metadata: {
   *       incident: incidentDetails,
   *       actionTaken: 'global_session_termination',
   *       requiresPasswordReset: true
   *     }
   *   });
   *
   *   // Disable account until password reset
   *   await authService.updateUserProfile(userId, {
   *     isActive: false,
   *     metadata: {
   *       disabledReason: 'security_incident',
   *       disabledAt: new Date(),
   *       requiresPasswordReset: true
   *     }
   *   });
   * };
   *
   * // Password change enforcement
   * const enforcePasswordChange = async (userId: string) => {
   *   // Terminate all existing sessions to force re-authentication
   *   await authService.terminateAllUserSessions(userId);
   *
   *   // Update user profile to track password change
   *   await authService.updateUserProfile(userId, {
   *     passwordChangedAt: new Date(),
   *     metadata: {
   *       passwordChangeEnforced: true,
   *       allSessionsTerminated: true
   *     }
   *   });
   *
   *   // Log password enforcement
   *   await authService.logSecurityEvent({
   *     eventType: 'password_change_enforcement',
   *     userId,
   *     description: 'All sessions terminated following password change',
   *     metadata: {
   *       enforcementReason: 'policy_compliance',
   *       newPasswordRequired: true
   *     }
   *   });
   * };
   *
   * // Bulk user session management
   * const massLogoutUsers = async (userIds: string[], reason: string) => {
   *   const results = [];
   *
   *   for (const userId of userIds) {
   *     try {
   *       const sessionsBefore = await authService.getUserSessions(userId);
   *       await authService.terminateAllUserSessions(userId);
   *
   *       await authService.logSecurityEvent({
   *         eventType: 'mass_logout',
   *         userId,
   *         description: `User included in mass logout operation`,
   *         metadata: {
   *           reason,
   *           sessionCount: sessionsBefore.length,
   *           operation: 'bulk_termination'
   *         }
   *       });
   *
   *       results.push({ userId, success: true, sessionCount: sessionsBefore.length });
   *     } catch (error) {
   *       results.push({ userId, success: false, error: error.message });
   *     }
   *   }
   *
   *   return results;
   * };
   *
   * // Scheduled security maintenance
   * const performSecurityMaintenance = async () => {
   *   const securityEvents = await authService.getSecurityEvents(
   *     undefined,
   *     'suspicious_activity',
   *     new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
   *   );
   *
   *   // Get unique users with suspicious activity
   *   const suspiciousUsers = [...new Set(
   *     securityEvents
   *       .filter(event => event.userId)
   *       .map(event => event.userId!)
   *   )];
   *
   *   if (suspiciousUsers.length > 0) {
   *     console.log(`Performing security maintenance for ${suspiciousUsers.length} users`);
   *
   *     for (const userId of suspiciousUsers) {
   *       await authService.terminateAllUserSessions(userId);
   *
   *       await authService.logSecurityEvent({
   *         eventType: 'preventive_session_termination',
   *         userId,
   *         description: 'Sessions terminated due to suspicious activity detection',
   *         severity: 'warning',
   *         metadata: {
   *           maintenanceType: 'preventive_security',
   *           suspiciousEventCount: securityEvents.filter(e => e.userId === userId).length
   *         }
   *       });
   *     }
   *   }
   * };
   * ```
   */
  terminateAllUserSessions(userId: string): Promise<void>;

  /**
   * Logs a security event for audit trails and monitoring.
   *
   * @remarks
   * Security event logging method that records security-relevant activities
   * for compliance, monitoring, and incident response. This method creates
   * comprehensive audit trails that support forensic analysis and regulatory
   * compliance requirements.
   *
   * Event logging supports:
   * - **Authentication events**: Login attempts, failures, successes
   * - **Authorization events**: Permission checks, role assignments
   * - **Security events**: Suspicious activity, policy violations
   * - **Administrative events**: User management, system changes
   * - **System events**: Infrastructure issues, performance alerts
   *
   * Security events enable:
   * - Compliance reporting and audit trails
   * - Suspicious activity detection and alerting
   * - Forensic analysis for security incidents
   * - Performance monitoring and optimization
   * - User behavior analysis and insights
   *
   * @param event - Security event information to log
   * @returns Promise that resolves when event is logged
   *
   * @example
   * ```typescript
   * // Log successful authentication
   * await authService.logSecurityEvent({
   *   eventType: 'authentication_success',
   *   userId: 'user-123',
   *   description: 'User successfully authenticated via local method',
   *   ipAddress: '192.168.1.100',
   *   userAgent: 'Mozilla/5.0...',
   *   location: {
   *     country: 'US',
   *     region: 'CA',
   *     city: 'San Francisco'
   *   },
   *   metadata: {
   *     authMethod: 'local',
   *     sessionId: 'session-456',
   *     loginDuration: 1250
   *   }
   * });
   *
   * // Log suspicious activity
   * await authService.logSecurityEvent({
   *   eventType: 'suspicious_activity',
   *   userId: 'user-789',
   *   description: 'Multiple failed login attempts from unusual location',
   *   severity: 'warning',
   *   ipAddress: '203.0.113.1',
   *   location: {
   *     country: 'XX',
   *     city: 'Unknown'
   *   },
   *   metadata: {
   *     failedAttempts: 5,
   *     timeWindow: '300_seconds',
   *     previousLocation: 'US',
   *     riskScore: 85
   *   }
   * });
   *
   * // Log administrative action
   * await authService.logSecurityEvent({
   *   eventType: 'admin_user_role_change',
   *   userId: 'user-456',
   *   description: 'User role changed from PLAYER to COACH',
   *   severity: 'info',
   *   metadata: {
   *     adminUserId: 'admin-123',
   *     previousRoles: ['PLAYER'],
   *     newRoles: ['PLAYER', 'COACH'],
   *     reason: 'promotion_to_assistant_coach'
   *   }
   * });
   *
   * // Automated security monitoring
   * const monitorFailedLogins = async (userId: string, ipAddress: string) => {
   *   // Get recent failed login events
   *   const recentEvents = await authService.getSecurityEvents(
   *     userId,
   *     'authentication_failed',
   *     new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
   *   );
   *
   *   const failedAttempts = recentEvents.filter(event =>
   *     event.ipAddress === ipAddress
   *   ).length;
   *
   *   if (failedAttempts >= 5) {
   *     // Log security alert
   *     await authService.logSecurityEvent({
   *       eventType: 'brute_force_detected',
   *       userId,
   *       description: 'Multiple failed login attempts detected - possible brute force attack',
   *       severity: 'critical',
   *       ipAddress,
   *       metadata: {
   *         failedAttemptCount: failedAttempts,
   *         timeWindow: '15_minutes',
   *         actionTaken: 'account_lockout_recommended'
   *       }
   *     });
   *
   *     return { shouldLockAccount: true, failedAttempts };
   *   }
   *
   *   return { shouldLockAccount: false, failedAttempts };
   * };
   *
   * // Security event correlation
   * const analyzeSecurityPattern = async (userId: string) => {
   *   const events = await authService.getSecurityEvents(
   *     userId,
   *     undefined,
   *     new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
   *   );
   *
   *   const analysis = {
   *     totalEvents: events.length,
   *     authenticationFailures: events.filter(e => e.eventType.includes('failed')).length,
   *     uniqueLocations: new Set(events.map(e => e.location?.country).filter(Boolean)).size,
   *     suspiciousEvents: events.filter(e => e.severity === 'warning' || e.severity === 'error').length
   *   };
   *
   *   // Log analysis results
   *   await authService.logSecurityEvent({
   *     eventType: 'security_pattern_analysis',
   *     userId,
   *     description: '24-hour security activity analysis completed',
   *     metadata: {
   *       analysis,
   *       riskLevel: analysis.suspiciousEvents > 3 ? 'high' :
   *                  analysis.suspiciousEvents > 1 ? 'medium' : 'low'
   *     }
   *   });
   *
   *   return analysis;
   * };
   * ```
   */
  logSecurityEvent(event: SecurityEvent): Promise<void>;

  /**
   * Retrieves security events with optional filtering.
   *
   * @remarks
   * Security event retrieval method for audit analysis, monitoring dashboards,
   * and compliance reporting. This method provides flexible filtering
   * capabilities to support various security analysis and reporting needs.
   *
   * Filtering capabilities:
   * - **User-specific events**: Filter by user ID for user-focused analysis
   * - **Event type filtering**: Specific event types for targeted analysis
   * - **Time-based filtering**: Events within specific time ranges
   * - **Severity filtering**: Focus on critical or warning events
   * - **Combined filtering**: Multiple criteria for precise queries
   *
   * Common use cases:
   * - Security dashboard displays
   * - Compliance audit reports
   * - Incident investigation and forensics
   * - User activity monitoring
   * - Trend analysis and security insights
   *
   * @param userId - Optional user ID to filter events for specific user
   * @param eventType - Optional event type to filter for specific event categories
   * @param fromDate - Optional date to filter events from specific time onwards
   * @returns Promise resolving to array of matching security events
   *
   * @example
   * ```typescript
   * // Get all security events for a user
   * const userEvents = await authService.getSecurityEvents('user-123');
   * console.log(`User has ${userEvents.length} security events`);
   *
   * // Get failed login attempts from last 24 hours
   * const failedLogins = await authService.getSecurityEvents(
   *   undefined,
   *   'authentication_failed',
   *   new Date(Date.now() - 24 * 60 * 60 * 1000)
   * );
   *
   * console.log(`${failedLogins.length} failed login attempts in last 24 hours`);
   *
   * // Get recent suspicious activity for monitoring dashboard
   * const suspiciousEvents = await authService.getSecurityEvents(
   *   undefined,
   *   'suspicious_activity',
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last week
   * );
   *
   * // Security monitoring dashboard
   * const buildSecurityDashboard = async () => {
   *   const now = new Date();
   *   const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
   *   const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
   *
   *   const [
   *     todayEvents,
   *     failedLogins,
   *     suspiciousActivity,
   *     adminActions
   *   ] = await Promise.all([
   *     authService.getSecurityEvents(undefined, undefined, oneDayAgo),
   *     authService.getSecurityEvents(undefined, 'authentication_failed', oneWeekAgo),
   *     authService.getSecurityEvents(undefined, 'suspicious_activity', oneWeekAgo),
   *     authService.getSecurityEvents(undefined, 'admin_action', oneWeekAgo)
   *   ]);
   *
   *   return {
   *     todayEventsCount: todayEvents.length,
   *     weeklyFailedLogins: failedLogins.length,
   *     suspiciousActivityCount: suspiciousActivity.length,
   *     adminActionCount: adminActions.length,
   *     topEventTypes: getTopEventTypes(todayEvents),
   *     criticalEvents: todayEvents.filter(e => e.severity === 'critical'),
   *     locationAnalysis: analyzeEventLocations(todayEvents)
   *   };
   * };
   *
   * // User activity report
   * const generateUserActivityReport = async (userId: string, days: number = 30) => {
   *   const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
   *   const events = await authService.getSecurityEvents(userId, undefined, fromDate);
   *
   *   const report = {
   *     userId,
   *     reportPeriod: { days, fromDate, toDate: new Date() },
   *     totalEvents: events.length,
   *     eventBreakdown: {
   *       authentications: events.filter(e => e.eventType.includes('authentication')).length,
   *       profileChanges: events.filter(e => e.eventType.includes('profile')).length,
   *       securityActions: events.filter(e => e.eventType.includes('security')).length,
   *       suspiciousActivities: events.filter(e => e.eventType.includes('suspicious')).length
   *     },
   *     severityBreakdown: {
   *       info: events.filter(e => e.severity === 'info').length,
   *       warning: events.filter(e => e.severity === 'warning').length,
   *       error: events.filter(e => e.severity === 'error').length,
   *       critical: events.filter(e => e.severity === 'critical').length
   *     },
   *     locationSummary: analyzeUserLocations(events),
   *     timelineSummary: createEventTimeline(events)
   *   };
   *
   *   return report;
   * };
   *
   * // Real-time security monitoring
   * const monitorSecurityEvents = async (callback: (event: SecurityEvent) => void) => {
   *   const lastCheck = new Date(Date.now() - 60000); // 1 minute ago
   *
   *   const recentEvents = await authService.getSecurityEvents(
   *     undefined,
   *     undefined,
   *     lastCheck
   *   );
   *
   *   // Process high-priority events
   *   const criticalEvents = recentEvents.filter(event =>
   *     event.severity === 'critical' || event.severity === 'error'
   *   );
   *
   *   criticalEvents.forEach(callback);
   *
   *   return {
   *     totalRecentEvents: recentEvents.length,
   *     criticalEvents: criticalEvents.length,
   *     needsAttention: criticalEvents.length > 0
   *   };
   * };
   * ```
   */
  getSecurityEvents(userId?: string, eventType?: string, fromDate?: Date): Promise<SecurityEvent[]>;

  /**
   * Changes a user's password with validation and security logging.
   *
   * @remarks
   * Secure password change method that validates current credentials,
   * applies new passwords, and maintains security through proper logging
   * and session management. This method enforces security policies and
   * provides audit trails for password changes.
   *
   * Password change process:
   * 1. **Current password verification**: Validate existing credentials
   * 2. **New password validation**: Check strength and policy compliance
   * 3. **Password update**: Securely store new password with proper hashing
   * 4. **Session management**: Optionally terminate other sessions
   * 5. **Security logging**: Record password change event
   * 6. **Notification**: Alert user of password change (optional)
   *
   * Security considerations:
   * - Password strength enforcement
   * - Previous password history checking
   * - Rate limiting for password change attempts
   * - Session termination for security
   * - Multi-factor authentication requirements
   *
   * @param userId - User requesting password change
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set
   * @returns Promise that resolves when password change is complete
   *
   * @example
   * ```typescript
   * // Standard password change
   * try {
   *   await authService.changePassword(
   *     'user-123',
   *     'currentPassword123',
   *     'newSecurePassword456!'
   *   );
   *   console.log('Password changed successfully');
   * } catch (error) {
   *   console.error('Password change failed:', error.message);
   * }
   *
   * // Password change with additional security measures
   * const securePasswordChange = async (
   *   userId: string,
   *   currentPassword: string,
   *   newPassword: string
   * ) => {
   *   // Validate password strength
   *   if (!isStrongPassword(newPassword)) {
   *     throw new Error('New password does not meet strength requirements');
   *   }
   *
   *   // Check password history (implementation would check against stored hashes)
   *   const isReusedPassword = await checkPasswordHistory(userId, newPassword);
   *   if (isReusedPassword) {
   *     throw new Error('Cannot reuse recent passwords');
   *   }
   *
   *   // Perform password change
   *   await authService.changePassword(userId, currentPassword, newPassword);
   *
   *   // Terminate other sessions for security
   *   await authService.terminateAllUserSessions(userId);
   *
   *   // Log additional security event
   *   await authService.logSecurityEvent({
   *     eventType: 'secure_password_change',
   *     userId,
   *     description: 'Password changed with additional security measures',
   *     metadata: {
   *       allSessionsTerminated: true,
   *       passwordStrengthValidated: true,
   *       historyChecked: true
   *     }
   *   });
   * };
   *
   * // Administrative password reset
   * const adminPasswordReset = async (
   *   adminUserId: string,
   *   targetUserId: string,
   *   temporaryPassword: string
   * ) => {
   *   // Verify admin has permission
   *   const canResetPasswords = await authService.hasPermission(
   *     adminUserId,
   *     'reset_user_passwords'
   *   );
   *
   *   if (!canResetPasswords) {
   *     throw new Error('Insufficient permissions for password reset');
   *   }
   *
   *   // Set temporary password (this would require a different method in practice)
   *   // await authService.setTemporaryPassword(targetUserId, temporaryPassword);
   *
   *   // Log administrative action
   *   await authService.logSecurityEvent({
   *     eventType: 'admin_password_reset',
   *     userId: targetUserId,
   *     description: 'Password reset by administrator',
   *     severity: 'warning',
   *     metadata: {
   *       adminUserId,
   *       resetReason: 'user_request',
   *       temporaryPasswordSet: true,
   *       requiresPasswordChange: true
   *     }
   *   });
   *
   *   // Terminate all user sessions
   *   await authService.terminateAllUserSessions(targetUserId);
   * };
   *
   * // Password change workflow with validation
   * const passwordChangeWorkflow = async (
   *   userId: string,
   *   currentPassword: string,
   *   newPassword: string,
   *   confirmPassword: string
   * ) => {
   *   // Validate inputs
   *   if (newPassword !== confirmPassword) {
   *     throw new Error('Password confirmation does not match');
   *   }
   *
   *   if (newPassword === currentPassword) {
   *     throw new Error('New password must be different from current password');
   *   }
   *
   *   // Check password strength
   *   const strengthCheck = analyzePasswordStrength(newPassword);
   *   if (strengthCheck.score < 3) {
   *     throw new Error(`Password too weak: ${strengthCheck.feedback.join(', ')}`);
   *   }
   *
   *   try {
   *     // Attempt password change
   *     await authService.changePassword(userId, currentPassword, newPassword);
   *
   *     // Success - update user profile
   *     await authService.updateUserProfile(userId, {
   *       passwordChangedAt: new Date(),
   *       metadata: {
   *         passwordChangeMethod: 'user_initiated',
   *         strengthScore: strengthCheck.score
   *       }
   *     });
   *
   *     return {
   *       success: true,
   *       message: 'Password changed successfully',
   *       recommendations: [
   *         'Your password has been updated',
   *         'Other devices will be logged out for security',
   *         'Consider enabling two-factor authentication'
   *       ]
   *     };
   *   } catch (error) {
   *     // Log failed attempt
   *     await authService.logSecurityEvent({
   *       eventType: 'password_change_failed',
   *       userId,
   *       description: 'Password change attempt failed',
   *       severity: 'warning',
   *       metadata: {
   *         reason: error.message,
   *         strengthScore: strengthCheck.score
   *       }
   *     });
   *
   *     throw error;
   *   }
   * };
   * ```
   */
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;

  /**
   * Enables two-factor authentication for a user account.
   *
   * @remarks
   * Multi-factor authentication setup method that configures additional
   * security layers for user accounts. This method supports various 2FA
   * methods including TOTP authenticator apps, SMS, and email-based
   * verification codes.
   *
   * 2FA setup process:
   * 1. **Method selection**: Choose appropriate 2FA method for user
   * 2. **Secret generation**: Create TOTP secrets or setup SMS/email
   * 3. **Verification**: Confirm setup with test code validation
   * 4. **Backup codes**: Generate emergency access codes
   * 5. **Profile update**: Update user profile with 2FA status
   * 6. **Security logging**: Record 2FA enablement event
   *
   * Security benefits:
   * - Additional authentication factor beyond passwords
   * - Protection against credential theft and phishing
   * - Compliance with security policies and regulations
   * - Enhanced account security for sensitive operations
   *
   * @param userId - User to enable two-factor authentication for
   * @param method - Two-factor method to enable (totp, sms, email)
   * @returns Promise resolving to setup information (secrets, backup codes)
   *
   * @example
   * ```typescript
   * // Enable TOTP (authenticator app) 2FA
   * const totpSetup = await authService.enableTwoFactor('user-123', 'totp');
   *
   * console.log('TOTP Secret:', totpSetup.secret);
   * console.log('Backup Codes:', totpSetup.backupCodes);
   *
   * // Display QR code for user to scan
   * const qrCodeUrl = `otpauth://totp/TW Softball:user@example.com?secret=${totpSetup.secret}&issuer=TW Softball`;
   *
   * // Enable SMS-based 2FA
   * const smsSetup = await authService.enableTwoFactor('user-456', 'sms');
   * console.log('SMS 2FA enabled for user');
   *
   * // Complete 2FA setup workflow
   * const completeTwoFactorSetup = async (
   *   userId: string,
   *   method: 'totp' | 'sms' | 'email',
   *   phoneNumber?: string,
   *   email?: string
   * ) => {
   *   try {
   *     // Update contact information if needed
   *     if (method === 'sms' && phoneNumber) {
   *       await authService.updateUserProfile(userId, { phoneNumber });
   *     }
   *     if (method === 'email' && email) {
   *       await authService.updateUserProfile(userId, { email });
   *     }
   *
   *     // Enable 2FA
   *     const setupResult = await authService.enableTwoFactor(userId, method);
   *
   *     // For TOTP, provide setup instructions
   *     if (method === 'totp' && setupResult.secret) {
   *       return {
   *         success: true,
   *         method,
   *         setupData: {
   *           secret: setupResult.secret,
   *           qrCode: generateQRCode(setupResult.secret, userId),
   *           backupCodes: setupResult.backupCodes,
   *           instructions: [
   *             'Install an authenticator app (Google Authenticator, Authy, etc.)',
   *             'Scan the QR code or enter the secret manually',
   *             'Enter the 6-digit code from your app to complete setup',
   *             'Save the backup codes in a secure location'
   *           ]
   *         }
   *       };
   *     }
   *
   *     return {
   *       success: true,
   *       method,
   *       message: `Two-factor authentication enabled via ${method}`
   *     };
   *   } catch (error) {
   *     await authService.logSecurityEvent({
   *       eventType: 'two_factor_setup_failed',
   *       userId,
   *       description: `Failed to enable 2FA via ${method}`,
   *       severity: 'warning',
   *       metadata: { method, error: error.message }
   *     });
   *
   *     throw error;
   *   }
   * };
   *
   * // Multiple 2FA methods setup
   * const setupMultipleTwoFactorMethods = async (userId: string) => {
   *   const results = [];
   *
   *   // Setup TOTP as primary
   *   try {
   *     const totpResult = await authService.enableTwoFactor(userId, 'totp');
   *     results.push({ method: 'totp', success: true, data: totpResult });
   *   } catch (error) {
   *     results.push({ method: 'totp', success: false, error: error.message });
   *   }
   *
   *   // Setup SMS as backup
   *   try {
   *     await authService.enableTwoFactor(userId, 'sms');
   *     results.push({ method: 'sms', success: true });
   *   } catch (error) {
   *     results.push({ method: 'sms', success: false, error: error.message });
   *   }
   *
   *   const successfulMethods = results.filter(r => r.success).map(r => r.method);
   *
   *   await authService.logSecurityEvent({
   *     eventType: 'multiple_2fa_setup',
   *     userId,
   *     description: `Multiple 2FA methods configured: ${successfulMethods.join(', ')}`,
   *     metadata: {
   *       configuredMethods: successfulMethods,
   *       totalAttempts: results.length,
   *       successCount: successfulMethods.length
   *     }
   *   });
   *
   *   return results;
   * };
   * ```
   */
  enableTwoFactor(
    userId: string,
    method: 'totp' | 'sms' | 'email'
  ): Promise<{ secret?: string; backupCodes?: string[] }>;

  /**
   * Disables two-factor authentication for a user account.
   *
   * @remarks
   * Two-factor authentication removal method that securely disables
   * additional authentication factors while maintaining security through
   * proper validation and audit logging. This method should require
   * appropriate authentication and authorization.
   *
   * 2FA disabling process:
   * 1. **Authorization verification**: Ensure user has permission to disable 2FA
   * 2. **Identity confirmation**: Verify current credentials or admin authority
   * 3. **Method removal**: Remove 2FA configuration and secrets
   * 4. **Profile update**: Update user profile to reflect disabled 2FA
   * 5. **Security logging**: Record 2FA disabling event
   * 6. **Notification**: Alert user of security change (optional)
   *
   * Security considerations:
   * - Require strong authentication before disabling
   * - Log disabling events for audit trails
   * - Consider cooling-off periods for re-enabling
   * - Alert user of reduced security posture
   * - Administrative override capabilities
   *
   * @param userId - User to disable two-factor authentication for
   * @returns Promise that resolves when 2FA is disabled
   *
   * @example
   * ```typescript
   * // Standard 2FA disabling
   * await authService.disableTwoFactor('user-123');
   * console.log('Two-factor authentication disabled');
   *
   * // Secure 2FA disabling with verification
   * const secureTwoFactorDisable = async (
   *   userId: string,
   *   currentPassword: string,
   *   reason?: string
   * ) => {
   *   // Verify current password before disabling
   *   const authResult = await authService.authenticate(
   *     'local',
   *     { username: await getUsernameById(userId), password: currentPassword }
   *   );
   *
   *   if (!authResult.success) {
   *     throw new Error('Current password verification failed');
   *   }
   *
   *   // Get current 2FA methods before disabling
   *   const userProfile = await authService.getUserProfile(userId);
   *   const previousMethods = userProfile?.twoFactorMethods || [];
   *
   *   // Disable 2FA
   *   await authService.disableTwoFactor(userId);
   *
   *   // Enhanced security logging
   *   await authService.logSecurityEvent({
   *     eventType: 'two_factor_disabled_verified',
   *     userId,
   *     description: 'Two-factor authentication disabled with password verification',
   *     severity: 'warning',
   *     metadata: {
   *       previousMethods,
   *       reason: reason || 'user_request',
   *       passwordVerified: true,
   *       reducedSecurity: true
   *     }
   *   });
   *
   *   return {
   *     success: true,
   *     message: '2FA disabled successfully',
   *     warnings: [
   *       'Your account security has been reduced',
   *       'Consider re-enabling 2FA for better protection',
   *       'Monitor your account for suspicious activity'
   *     ]
   *   };
   * };
   *
   * // Administrative 2FA override
   * const adminDisableTwoFactor = async (
   *   adminUserId: string,
   *   targetUserId: string,
   *   reason: string
   * ) => {
   *   // Verify admin permissions
   *   const canDisable2FA = await authService.hasPermission(
   *     adminUserId,
   *     'admin_disable_2fa'
   *   );
   *
   *   if (!canDisable2FA) {
   *     throw new Error('Insufficient permissions to disable user 2FA');
   *   }
   *
   *   // Get target user info
   *   const targetUser = await authService.getUserProfile(targetUserId);
   *   if (!targetUser) {
   *     throw new Error('Target user not found');
   *   }
   *
   *   const previousMethods = targetUser.twoFactorMethods || [];
   *
   *   // Disable 2FA
   *   await authService.disableTwoFactor(targetUserId);
   *
   *   // Log administrative action
   *   await authService.logSecurityEvent({
   *     eventType: 'admin_2fa_override',
   *     userId: targetUserId,
   *     description: 'Two-factor authentication disabled by administrator',
   *     severity: 'warning',
   *     metadata: {
   *       adminUserId,
   *       adminUsername: (await authService.getUserProfile(adminUserId))?.username,
   *       reason,
   *       previousMethods,
   *       overrideType: 'administrative'
   *     }
   *   });
   *
   *   // Terminate user sessions for security
   *   await authService.terminateAllUserSessions(targetUserId);
   *
   *   return {
   *     success: true,
   *     adminAction: true,
   *     targetUser: targetUser.username,
   *     sessionsTerminated: true
   *   };
   * };
   *
   * // 2FA management workflow
   * const manageTwoFactorAuthentication = async (userId: string) => {
   *   const userProfile = await authService.getUserProfile(userId);
   *
   *   if (!userProfile) {
   *     throw new Error('User not found');
   *   }
   *
   *   const currentStatus = {
   *     enabled: userProfile.twoFactorEnabled || false,
   *     methods: userProfile.twoFactorMethods || []
   *   };
   *
   *   if (currentStatus.enabled) {
   *     // Provide disabling options
   *     return {
   *       currentStatus,
   *       actions: {
   *         disable: () => authService.disableTwoFactor(userId),
   *         addMethod: (method: 'totp' | 'sms' | 'email') =>
   *           authService.enableTwoFactor(userId, method)
   *       },
   *       recommendations: [
   *         'Keep 2FA enabled for security',
   *         'Consider adding backup methods',
   *         'Regularly update backup codes'
   *       ]
   *     };
   *   } else {
   *     // Provide enabling options
   *     return {
   *       currentStatus,
   *       actions: {
   *         enable: (method: 'totp' | 'sms' | 'email') =>
   *           authService.enableTwoFactor(userId, method)
   *       },
   *       recommendations: [
   *         'Enable 2FA for better account security',
   *         'TOTP (authenticator app) is most secure',
   *         'Keep backup codes in a safe place'
   *       ]
   *     };
   *   }
   * };
   * ```
   */
  disableTwoFactor(userId: string): Promise<void>;

  /**
   * Retrieves the currently authenticated user information.
   *
   * @remarks
   * Returns information about the currently authenticated user session,
   * including basic profile data. Returns null if no user is currently
   * authenticated or if the session has expired.
   *
   * Used for:
   * - Session validation and user context
   * - Authorization checks and permissions
   * - User-specific business logic
   * - Audit trail and logging contexts
   *
   * @returns Promise resolving to current user info or null if not authenticated
   */
  getCurrentUser(): Promise<{ userId: string } | null>;
}
