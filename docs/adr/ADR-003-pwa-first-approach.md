# ADR-003: Adopt PWA-First Approach

## Status

**Accepted** - Date: 2025-08-27

## Context

We're building a softball game recording application that needs to:

- Work reliably during games regardless of internet connectivity
- Provide instant, native-like performance for real-time game recording
- Be accessible across all devices (phones, tablets, laptops) without app store
  distribution
- Support offline-first operation with automatic sync when connectivity returns
- Deliver a mobile-native experience while maintaining cross-platform
  compatibility
- Allow easy deployment and updates without app store approval processes

Our users (coaches and scorekeepers) need to record game events in real-time,
often in locations with poor or intermittent network connectivity (baseball
fields, parks). The application must be:

- **Instantly responsive** (no network delays during critical recording moments)
- **Always available** (works completely offline)
- **Cross-platform** (same experience on iOS, Android, desktop)
- **Easy to distribute** (no complex installation process)

We evaluated several application architecture approaches:

1. **Native Mobile Apps** (iOS/Android separate codebases)
2. **React Native / Flutter** (cross-platform mobile framework)
3. **Web Application** (traditional web app)
4. **Progressive Web App (PWA)** (web app with native capabilities)
5. **Electron Desktop App** (desktop-focused with web technologies)

## Decision

We will build a **Progressive Web App (PWA)** as our primary application
platform for the following reasons:

### Core PWA Benefits for Softball Recording

#### 1. Offline-First Architecture

PWAs provide native offline capabilities through Service Workers:

```javascript
// Service Worker for offline game recording
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/games/')) {
    event.respondWith(
      // Try network first, fall back to cache
      fetch(event.request)
        .catch(() => caches.match(event.request))
        .catch(() => handleOfflineGameRecording(event.request))
    );
  }
});

const handleOfflineGameRecording = async request => {
  // Queue game events for later sync
  await queueGameEvent(request);
  return new Response(JSON.stringify({ status: 'queued' }));
};
```

#### 2. Native-Like User Experience

PWAs provide native app features while maintaining web flexibility:

```json
// Web App Manifest for native experience
{
  "name": "TW Softball",
  "short_name": "TWS",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1976d2",
  "background_color": "#ffffff",
  "start_url": "/",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

#### 3. Instant Loading and Performance

App Shell architecture ensures instant startup:

```typescript
// App Shell with instant loading
class GameRecordingApp {
  private appShell: AppShell;
  private gameService: OfflineGameService;

  async initialize(): Promise<void> {
    // App shell loads instantly
    await this.appShell.render();

    // Game data loads asynchronously
    this.gameService
      .loadCurrentGame()
      .then(game => this.renderGame(game))
      .catch(() => this.renderNewGameForm());
  }
}
```

#### 4. Cross-Platform Compatibility

Single codebase works across all platforms:

```scss
// Responsive design for all devices
.game-recording-interface {
  display: grid;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    // Tablet layout
    grid-template-columns: 1fr 1fr;
  }

  @media (min-width: 1024px) {
    // Desktop layout
    grid-template-columns: 1fr 2fr 1fr;
  }
}
```

### PWA Implementation Strategy

#### Service Worker Architecture

```typescript
class GameRecordingServiceWorker {
  private static readonly CACHE_VERSION = 'v1';
  private static readonly APP_SHELL_CACHE = 'app-shell-v1';
  private static readonly GAME_DATA_CACHE = 'game-data-v1';

  async handleInstall(): Promise<void> {
    // Cache app shell resources
    const cache = await caches.open(GameRecordingServiceWorker.APP_SHELL_CACHE);
    await cache.addAll([
      '/',
      '/static/css/main.css',
      '/static/js/main.js',
      '/offline.html',
    ]);
  }

  async handleFetch(request: Request): Promise<Response> {
    if (this.isGameDataRequest(request)) {
      return this.handleGameDataRequest(request);
    }

    if (this.isAppShellRequest(request)) {
      return this.handleAppShellRequest(request);
    }

    return fetch(request);
  }
}
```

#### Offline Data Management

```typescript
class OfflineGameService {
  private indexedDB: IDBDatabase;
  private syncQueue: SyncQueue;

  async recordAtBat(atBat: AtBatCommand): Promise<void> {
    // Store locally immediately
    await this.storeLocally(atBat);

    // Queue for sync when online
    await this.syncQueue.add(atBat);

    // Try immediate sync if online
    if (navigator.onLine) {
      await this.syncQueue.process();
    }
  }

  async syncWithServer(): Promise<void> {
    const pendingEvents = await this.syncQueue.getAllPending();

    for (const event of pendingEvents) {
      try {
        await this.sendToServer(event);
        await this.syncQueue.markAsProcessed(event.id);
      } catch (error) {
        // Retry later
        await this.syncQueue.markForRetry(event.id);
      }
    }
  }
}
```

#### Progressive Enhancement

```typescript
class ProgressiveGameInterface {
  async initialize(): Promise<void> {
    // Basic functionality works without any enhancements
    this.setupBasicGameRecording();

    // Enhanced features when available
    if ('serviceWorker' in navigator) {
      await this.enableOfflineMode();
    }

    if ('share' in navigator) {
      this.enableNativeSharing();
    }

    if ('vibrate' in navigator) {
      this.enableHapticFeedback();
    }

    if ('geolocation' in navigator) {
      this.enableLocationTracking();
    }
  }
}
```

## Alternatives Considered

### Alternative 1: Native Mobile Apps (iOS + Android)

**Pros:**

- Maximum performance and native integration
- Full access to device capabilities
- App store distribution and discovery
- Platform-specific UX optimization

**Cons:**

- Requires two separate codebases (iOS Swift, Android Kotlin)
- Significantly higher development and maintenance costs
- App store approval process delays updates
- Complex deployment pipeline
- No desktop support without additional development

**Rejected:** Development cost too high for our team size and timeline.

### Alternative 2: React Native / Flutter

**Pros:**

- Single codebase for mobile platforms
- Native performance characteristics
- Access to native device APIs
- Strong community and tooling support

**Cons:**

- Still requires app store distribution
- Limited desktop support
- Additional framework complexity
- Platform-specific bugs and differences
- Deployment complexity compared to web

**Rejected:** Deployment and distribution complexity outweighs benefits.

### Alternative 3: Traditional Web Application

**Pros:**

- Familiar development patterns
- Easy deployment and updates
- Cross-platform by default
- No app store requirements

**Cons:**

- Poor offline capabilities
- Limited native device integration
- Dependent on network connectivity
- Suboptimal mobile experience
- No app-like installation or home screen presence

**Rejected:** Offline requirements are critical for game recording scenarios.

### Alternative 4: Electron Desktop App

**Pros:**

- Native desktop integration
- Offline capabilities
- Access to file system and native APIs
- Familiar web development patterns

**Cons:**

- Desktop-only (no mobile support)
- Large application bundle size
- Resource intensive (memory/CPU)
- Complex distribution (installers, updates)
- Not suitable for on-field mobile usage

**Rejected:** Mobile usage is primary requirement.

## Implementation Details

### PWA Core Requirements

#### 1. Web App Manifest

```json
{
  "name": "TW Softball Game Recording",
  "short_name": "TW Softball",
  "description": "Offline-first softball game recording with undo/redo support",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#1976d2",
  "background_color": "#ffffff",
  "categories": ["sports", "utilities"],
  "lang": "en-US",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

#### 2. Service Worker Registration

```typescript
class PWAInstaller {
  async register(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        registration.addEventListener('updatefound', () => {
          this.handleServiceWorkerUpdate(registration);
        });

        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private handleServiceWorkerUpdate(
    registration: ServiceWorkerRegistration
  ): void {
    const newWorker = registration.installing;
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // Show update available notification
          this.showUpdateAvailableDialog();
        }
      });
    }
  }
}
```

#### 3. Offline-First Data Strategy

```typescript
interface OfflineDataManager {
  // Cache strategies
  cacheFirst(request: Request): Promise<Response>;
  networkFirst(request: Request): Promise<Response>;
  staleWhileRevalidate(request: Request): Promise<Response>;

  // Data synchronization
  syncWhenOnline(): Promise<void>;
  queueForSync(data: any): Promise<void>;

  // Conflict resolution
  resolveConflicts(localData: any, serverData: any): any;
}

class IndexedDBManager implements OfflineDataManager {
  private db: IDBDatabase;

  async storeGameEvent(event: DomainEvent): Promise<void> {
    const transaction = this.db.transaction(['events'], 'readwrite');
    const store = transaction.objectStore('events');

    await store.add({
      id: event.eventId,
      gameId: event.gameId,
      type: event.type,
      data: event,
      timestamp: event.timestamp,
      synced: false,
    });
  }
}
```

### Performance Optimization

#### 1. App Shell Architecture

```typescript
class AppShell {
  private shellElements: HTMLElement[];

  async initialize(): Promise<void> {
    // Load and cache minimal app shell
    await this.loadShellResources();

    // Render immediate UI
    this.renderSkeleton();

    // Load data asynchronously
    this.loadGameData();
  }

  private async loadShellResources(): Promise<void> {
    const criticalCSS = await this.loadCriticalCSS();
    const shellJS = await this.loadShellJavaScript();

    // Inline critical resources
    this.inlineCriticalCSS(criticalCSS);
    this.executeShellJS(shellJS);
  }
}
```

#### 2. Resource Optimization

```javascript
// Webpack configuration for PWA optimization
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  plugins: [
    new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\.twsoftball\.com/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 3,
          },
        },
      ],
    }),
  ],
};
```

### Mobile-Native Features

#### 1. Device Integration

```typescript
class NativeFeatures {
  async enableHapticFeedback(): Promise<void> {
    if ('vibrate' in navigator) {
      // Provide tactile feedback for game events
      this.onAtBatRecorded(() => navigator.vibrate([100, 30, 100]));
      this.onError(() => navigator.vibrate([200]));
    }
  }

  async enableCameraIntegration(): Promise<void> {
    if ('mediaDevices' in navigator) {
      // Future: Photo capture for game documentation
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.setupPhotoCapture(stream);
    }
  }

  async enableLocationServices(): Promise<void> {
    if ('geolocation' in navigator) {
      // Track game location for records
      const position = await navigator.geolocation.getCurrentPosition();
      this.recordGameLocation(position.coords);
    }
  }
}
```

#### 2. Installation Prompts

```typescript
class InstallPromptManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  initialize(): void {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });
  }

  async promptInstall(): Promise<void> {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();

      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`User ${outcome} the install prompt`);

      this.deferredPrompt = null;
      this.hideInstallButton();
    }
  }
}
```

## Consequences

### Positive

#### ✅ Offline-First Capability

- Games can be recorded completely offline
- Automatic synchronization when connectivity returns
- No data loss due to network issues
- Critical for field usage scenarios

#### ✅ Cross-Platform Compatibility

- Single codebase works on iOS, Android, desktop
- Consistent user experience across all devices
- Reduced development and maintenance costs
- Easier testing and quality assurance

#### ✅ Easy Deployment and Updates

- Instant deployment without app store approval
- Automatic updates when users visit the app
- No complex installation process for users
- Faster iteration and bug fix cycles

#### ✅ Native-Like Experience

- App-like interface with no browser chrome
- Home screen installation capability
- Push notifications support
- Haptic feedback and device integration

#### ✅ Performance Optimization

- App shell loads instantly
- Cached resources for fast startup
- Optimized for mobile devices
- Progressive enhancement based on device capabilities

#### ✅ Accessibility

- Works on any device with a modern browser
- No app store account or payment required
- Shareable via URL
- Works on devices with limited storage

### Negative

#### ❌ Browser Compatibility Requirements

- Requires modern browser with PWA support
- Limited functionality on older devices
- iOS Safari has some PWA limitations
- Feature parity differences across browsers

**Mitigation:**

- Progressive enhancement strategy
- Fallback functionality for unsupported features
- Clear browser compatibility documentation
- Graceful degradation for older browsers

#### ❌ App Store Distribution Limitations

- Not discoverable through app stores initially
- Users must find and install manually
- Reduced visibility compared to native apps
- No app store ratings/reviews

**Mitigation:**

- PWAs can now be submitted to app stores (Google Play, Microsoft Store)
- Focus on direct distribution and word-of-mouth
- Web-based marketing and SEO optimization
- Consider app store submission in future phases

#### ❌ Platform-Specific Feature Gaps

- Some native APIs not available to web apps
- iOS restrictions on PWA capabilities
- Limited background processing
- No deep system integration

**Mitigation:**

- Focus on core functionality that PWAs handle well
- Use web APIs that provide similar functionality
- Consider hybrid approach if specific native features needed
- Monitor PWA capability evolution

#### ❌ Performance Perception

- May be perceived as "just a website"
- Initial load time dependency on network
- JavaScript execution overhead vs native code
- Battery usage concerns on mobile

**Mitigation:**

- Aggressive caching and app shell optimization
- Performance budgets and monitoring
- Clear communication about offline capabilities
- User education about PWA benefits

### Risk Mitigation Strategies

**Risk:** iOS Safari PWA limitations affecting user experience

- **Mitigation:** Test extensively on iOS devices, implement workarounds for
  known issues
- **Monitoring:** User agent detection and iOS-specific analytics

**Risk:** Service Worker caching issues causing stale data

- **Mitigation:** Proper cache invalidation strategies and versioning
- **Monitoring:** Cache hit rates and data freshness metrics

**Risk:** IndexedDB storage limitations and browser clearing data

- **Mitigation:** Implement data export/import, warn users about storage
  clearing
- **Monitoring:** Storage usage tracking and data loss detection

**Risk:** Network sync conflicts with offline-created data

- **Mitigation:** Robust conflict resolution algorithms and user conflict
  resolution UI
- **Monitoring:** Sync success rates and conflict frequency metrics

## Compliance and Monitoring

### PWA Compliance Checklist

- [x] Web App Manifest with required fields
- [x] Service Worker with offline functionality
- [x] HTTPS serving (required for PWA features)
- [x] Responsive design for all screen sizes
- [x] App shell architecture
- [x] Progressive enhancement strategy

### Performance Targets

- **First Contentful Paint**: <1.5s on 3G
- **Largest Contentful Paint**: <2.5s on 3G
- **First Input Delay**: <100ms
- **Cumulative Layout Shift**: <0.1
- **Time to Interactive**: <3s on 3G

### Monitoring Strategy

```typescript
class PWAMetrics {
  trackPerformance(): void {
    // Core Web Vitals
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        this.reportMetric(entry.name, entry.value);
      }
    }).observe({ entryTypes: ['measure'] });
  }

  trackOfflineUsage(): void {
    window.addEventListener('online', () => {
      this.reportEvent('network-online');
    });

    window.addEventListener('offline', () => {
      this.reportEvent('network-offline');
    });
  }

  trackInstallation(): void {
    window.addEventListener('appinstalled', () => {
      this.reportEvent('pwa-installed');
    });
  }
}
```

## Future Considerations

### Phase 1: Core PWA (Current Focus)

- ✅ Service Worker implementation
- ✅ Offline game recording
- ✅ App Shell architecture
- [ ] Install prompts and home screen integration

### Phase 2: Enhanced Mobile Experience

- [ ] Push notifications for game updates
- [ ] Background sync for data synchronization
- [ ] Advanced caching strategies
- [ ] Performance optimization

### Phase 3: Native Integration

- [ ] Web Share API for game sharing
- [ ] File System Access API for data export
- [ ] Periodic Background Sync
- [ ] Advanced device integration

### Phase 4: App Store Distribution

- [ ] Google Play Store submission
- [ ] Microsoft Store submission
- [ ] App store optimization
- [ ] Store-specific features

## References

- [Progressive Web Apps by Google](https://web.dev/progressive-web-apps/)
- [Service Worker API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest Specification](https://www.w3.org/TR/appmanifest/)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [Workbox for PWA Development](https://developers.google.com/web/tools/workbox)

---

**Decision made by**: Development Team  
**Review date**: 2025-09-27 (1 month)  
**Dependencies**: ADR-002 (Event Sourcing Pattern)
