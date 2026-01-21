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

  // Request fullscreen on app load (if running as PWA)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const shouldRequestFullscreen = () =>
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    const requestFullscreen = async () => {
      if (!shouldRequestFullscreen()) return; // avoid bothering normal browser sessions
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.log('Fullscreen request failed (may be normal):', err.message);
      }
    };

    // Request fullscreen on first user interaction (required by browsers)
    const handleUserInteraction = () => {
      requestFullscreen();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
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
