import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Register service worker for PWA functionality
import { registerSW } from 'virtual:pwa-register';

import { App } from './app';
import './index.css';

registerSW({
  onNeedRefresh() {
    // Handle when a new version is available
    // TODO: Implement user notification for updates
  },
  onOfflineReady() {
    // Handle when the app is ready to work offline
    // TODO: Implement offline ready notification
  },
  onRegistered(registration) {
    // Handle successful service worker registration
    if (registration) {
      // Service worker registered successfully
    }
  },
  onRegisterError(error) {
    // Handle service worker registration errors
    // Silently handle errors to prevent app crashes
    // Error is already logged by the service worker system
    void error; // Acknowledge error parameter
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
