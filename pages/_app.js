// pages/_app.js
import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { UserProfileProvider } from '../utils/userProfileStore';
import { isPWA, logPWAStatus } from '../utils/pwaDetection';
import { BluetoothProvider } from '../context/BluetoothProvider';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Log PWA status for debugging
    logPWAStatus();
    
    // Hide install button if already running as PWA
    if (isPWA()) {
      setShowInstallButton(false);
      console.log('✅ Running as installed PWA - install button hidden');
    }
    
    // Register service worker (ensure /public/sw.js exists)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => console.log('SW registered with scope:', reg.scope))
        .catch((err) => console.error('SW registration failed:', err));
    }

    // Capture beforeinstallprompt to show a custom install UI
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      console.log('beforeinstallprompt captured');
    }

    // Optional: hide install UI if app already installed
    function handleAppInstalled() {
      setDeferredPrompt(null);
      setShowInstallButton(false);
      console.log('PWA installed');
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Simple back button handler - let router manage history
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Just ensure we can go back normally - don't trap the user
    // The app will handle back navigation via router
  }, []);

  // Request fullscreen on every app load and persist preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const requestFullscreen = async () => {
      try {
        // Check if user previously disabled fullscreen
        const fullscreenDisabled = localStorage.getItem('fullscreen-disabled') === 'true';
        if (fullscreenDisabled) return;

        // Check if already in fullscreen
        if (document.fullscreenElement) return;
        
        // Check if fullscreen API is available
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
          localStorage.setItem('fullscreen-enabled', 'true');
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
          localStorage.setItem('fullscreen-enabled', 'true');
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
          localStorage.setItem('fullscreen-enabled', 'true');
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
          localStorage.setItem('fullscreen-enabled', 'true');
        }
      } catch (err) {
        // Silently fail - some browsers/contexts don't allow fullscreen
        console.log('Fullscreen:', err.message);
      }
    };

    // Attempt fullscreen on every app start if previously enabled
    const previouslyEnabled = localStorage.getItem('fullscreen-enabled') === 'true';
    
    const handleUserInteraction = () => {
      requestFullscreen();
      document.removeEventListener('click', handleUserInteraction, { capture: true });
      document.removeEventListener('touchstart', handleUserInteraction, { capture: true });
    };

    // If previously enabled, try immediately on visibility change
    if (previouslyEnabled) {
      const handleVisibilityChange = () => {
        if (!document.hidden && !document.fullscreenElement) {
          requestFullscreen();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Always listen for first interaction on fresh load
    document.addEventListener('click', handleUserInteraction, { capture: true });
    document.addEventListener('touchstart', handleUserInteraction, { capture: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction, { capture: true });
      document.removeEventListener('touchstart', handleUserInteraction, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Trigger the browser install prompt (user gesture required)
  async function handleInstallClick() {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('User response to the install prompt:', outcome);
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } catch (err) {
      console.error('Error during install prompt:', err);
    }
  }

  return (
    <BluetoothProvider>
      <UserProfileProvider>
        <Component {...pageProps} />
      </UserProfileProvider>
    </BluetoothProvider>
  );
}

export default MyApp;
