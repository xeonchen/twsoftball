import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Register service worker for PWA functionality
import { registerSW } from 'virtual:pwa-register';

import { App } from './app';
import './index.css';
import { timerManager, setupTimerCleanup } from './timer-manager';

// Add TypeScript types for PWA events
declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }
}

// Initialize timer cleanup handlers
setupTimerCleanup();

registerSW({
  onNeedRefresh() {
    // Handle when a new version is available
    showUpdateNotification();
  },
  onOfflineReady() {
    // Handle when the app is ready to work offline
    showOfflineReadyNotification();
  },
  onRegistered(registration) {
    // Handle successful service worker registration
    if (registration) {
      // Service worker registered successfully
      showInstallPrompt();
    }
  },
  onRegisterError(error) {
    // Handle service worker registration errors
    // Silently handle errors to prevent app crashes
    // Error is already logged by the service worker system
    void error; // Acknowledge error parameter
  },
});

/**
 * Show update notification when new version is available
 */
function showUpdateNotification(): void {
  // Create and show update notification
  const updateNotification = document.createElement('div');
  updateNotification.id = 'update-notification';
  updateNotification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4f46e5;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 300px;
  `;
  updateNotification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">Update Available</div>
    <div style="font-size: 14px; margin-bottom: 12px;">A new version of TW Softball is available.</div>
    <button id="update-button" style="
      background: white;
      color: #4f46e5;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      margin-right: 8px;
    ">Update Now</button>
    <button id="dismiss-update" style="
      background: transparent;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
    ">Later</button>
  `;

  document.body.appendChild(updateNotification);

  // Handle update button click
  const updateButton = document.getElementById('update-button');
  updateButton?.addEventListener('click', () => {
    window.location.reload();
  });

  // Handle dismiss button click
  const dismissButton = document.getElementById('dismiss-update');
  dismissButton?.addEventListener('click', () => {
    updateNotification.remove();
  });

  // Auto-dismiss after 10 seconds if no action
  timerManager.setTimeout(() => {
    const notification = document.getElementById('update-notification');
    if (notification) {
      notification.remove();
    }
  }, 10000);
}

/**
 * Show offline ready notification
 */
function showOfflineReadyNotification(): void {
  const offlineNotification = document.createElement('div');
  offlineNotification.id = 'offline-notification';
  offlineNotification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #059669;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 300px;
  `;
  offlineNotification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">🏟️ Ready to Play Offline</div>
    <div style="font-size: 14px;">TW Softball is now available offline. You can record games even without internet connection!</div>
  `;

  document.body.appendChild(offlineNotification);

  // Auto-dismiss after 5 seconds
  timerManager.setTimeout(() => {
    const notification = document.getElementById('offline-notification');
    if (notification) {
      notification.style.transition = 'opacity 0.3s ease';
      notification.style.opacity = '0';
      timerManager.setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

/**
 * Show install prompt for PWA
 */
function showInstallPrompt(): void {
  // Only show if not already installed and prompt is available
  // eslint-disable-next-line no-undef -- BeforeInstallPromptEvent is declared globally above
  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // eslint-disable-next-line no-undef -- BeforeInstallPromptEvent is declared globally above
    deferredPrompt = e as BeforeInstallPromptEvent;

    // Show custom install prompt after a delay
    timerManager.setTimeout(() => {
      if (deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
        showCustomInstallPrompt(deferredPrompt);
      }
    }, 3000);
  });
}

/**
 * Show custom install prompt
 */
// eslint-disable-next-line no-undef -- BeforeInstallPromptEvent is declared globally above
function showCustomInstallPrompt(deferredPrompt: BeforeInstallPromptEvent): void {
  const installNotification = document.createElement('div');
  installNotification.id = 'install-notification';
  installNotification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: white;
    border: 1px solid #e5e7eb;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 400px;
    margin: 0 auto;
  `;
  installNotification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">📱 Install TW Softball</div>
    <div style="font-size: 14px; margin-bottom: 12px; color: #6b7280;">
      Install the app on your device for quick access and better performance.
    </div>
    <button id="install-button" style="
      background: #4f46e5;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      margin-right: 8px;
    ">Install App</button>
    <button id="dismiss-install" style="
      background: transparent;
      color: #6b7280;
      border: 1px solid #d1d5db;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
    ">Not Now</button>
  `;

  document.body.appendChild(installNotification);

  // Handle install button click
  const installButton = document.getElementById('install-button');
  installButton?.addEventListener('click', (): void => {
    void (async (): Promise<void> => {
      if (deferredPrompt) {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          // PWA install accepted - would be tracked via analytics in full implementation
        }
      }
      installNotification.remove();
    })();
  });

  // Handle dismiss button click
  const dismissButton = document.getElementById('dismiss-install');
  dismissButton?.addEventListener('click', () => {
    installNotification.remove();
  });

  // Auto-dismiss after 15 seconds if no action
  timerManager.setTimeout(() => {
    const notification = document.getElementById('install-notification');
    if (notification) {
      notification.remove();
    }
  }, 15000);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Initialize Web Vitals tracking in development mode
if (import.meta.env.DEV) {
  void import('./shared/lib/performance/webVitals').then(({ initWebVitals, consoleReporter }) => {
    initWebVitals(consoleReporter);
  });
}

// Export for testing
export {
  showUpdateNotification,
  showOfflineReadyNotification,
  showInstallPrompt,
  showCustomInstallPrompt,
};
