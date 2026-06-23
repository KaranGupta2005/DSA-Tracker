import '@/styles/globals.css';
import { useEffect, useState, useCallback } from 'react';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from '@/utils/createEmotionCache';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Snackbar, Button } from '@mui/material';
import theme from '@/utils/theme';
import { AuthProvider } from '@/context/AuthContext';
import OfflineBanner from '@/components/OfflineBanner';

// Client-side Emotion cache, shared for the whole session of the user in the browser
const clientSideEmotionCache = createEmotionCache();

export default function App({ Component, pageProps, emotionCache = clientSideEmotionCache }) {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  // Background sync: sync pending data within 30s of reconnection
  const syncPendingData = useCallback(async () => {
    try {
      // Sync activity scores
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

      // Fire sync requests for leaderboard, daily problem check, activity data
      const syncPromises = [
        fetch(`${backendUrl}/api/leaderboard`, { headers }).catch(() => null),
        fetch(`${backendUrl}/api/daily/today`, { headers }).catch(() => null),
      ];

      await Promise.allSettled(syncPromises);
    } catch (error) {
      // Failed sync - data retained locally for next connectivity event
      console.warn('Background sync failed, will retry on next online event:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let registrationRef = null;

    // Register service worker within 5 seconds of first page load
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        registrationRef = registration;

        // New version detection: check for waiting service worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdatePrompt(true);
        }

        // Listen for new service worker installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              setWaitingWorker(newWorker);
              setShowUpdatePrompt(true);
            }
          });
        });

        // Register background sync if available
        if ('SyncManager' in window) {
          await registration.sync.register('sync-pending-data').catch(() => {});
        }
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    };

    // Register SW within 5 seconds of page load
    const timer = setTimeout(registerSW, 1000);

    // Listen for controller change (new SW took control)
    const handleControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Listen for messages from service worker (background sync trigger)
    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'SYNC_PENDING_DATA') {
        syncPendingData();
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    // Sync pending data when coming back online (within 30 seconds)
    let syncTimeout = null;
    const handleOnline = () => {
      // Sync within 30 seconds of reconnection
      syncTimeout = setTimeout(syncPendingData, 2000);
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearTimeout(timer);
      if (syncTimeout) clearTimeout(syncTimeout);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      window.removeEventListener('online', handleOnline);
    };
  }, [syncPendingData]);

  // Handle update: tell waiting SW to skip waiting
  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdatePrompt(false);
  };

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <OfflineBanner />
          <Component {...pageProps} />

          {/* New version update prompt */}
          <Snackbar
            open={showUpdatePrompt}
            message="A new version is available!"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            action={
              <Button color="primary" size="small" onClick={handleUpdate} sx={{ color: '#60a5fa' }}>
                Refresh to update
              </Button>
            }
          />
        </AuthProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}
