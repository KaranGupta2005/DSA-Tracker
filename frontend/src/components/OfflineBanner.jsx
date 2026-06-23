import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOffline(!navigator.onLine);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Box
      role="alert"
      aria-live="assertive"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        bgcolor: '#dc2626',
        color: '#fff',
        py: 1,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <WifiOffIcon sx={{ fontSize: 18 }} />
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        You are currently offline. Some features may be unavailable.
      </Typography>
    </Box>
  );
}
