import { Box, Typography, Container, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import HistoryIcon from '@mui/icons-material/History';
import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const [cachedPages, setCachedPages] = useState([]);

  useEffect(() => {
    // Retrieve list of cached navigation pages from the service worker cache
    async function getCachedPages() {
      if ('caches' in window) {
        try {
          const cache = await caches.open('dsa-tracker-v1');
          const keys = await cache.keys();
          const pages = keys
            .filter((req) => req.mode === 'navigate' || req.destination === 'document')
            .map((req) => {
              const url = new URL(req.url);
              return url.pathname;
            })
            .filter((path) => path !== '/offline' && path !== '/_next/data');

          // Deduplicate
          const unique = [...new Set(pages)];
          setCachedPages(unique);
        } catch (err) {
          // Cache API not available
        }
      }
    }
    getCachedPages();
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0f172a',
        color: '#fff',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: '#1e293b',
            borderRadius: 3,
          }}
        >
          <WifiOffIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
          <Typography variant="h4" gutterBottom sx={{ color: '#f1f5f9', fontWeight: 600 }}>
            You&apos;re Offline
          </Typography>
          <Typography variant="body1" sx={{ color: '#94a3b8', mb: 3 }}>
            This page isn&apos;t available without an internet connection. Please check your
            connectivity and try again.
          </Typography>

          {cachedPages.length > 0 && (
            <Box sx={{ mt: 3, textAlign: 'left' }}>
              <Typography variant="subtitle1" sx={{ color: '#e2e8f0', mb: 1, fontWeight: 500 }}>
                <HistoryIcon sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
                Previously visited pages (available offline):
              </Typography>
              <List dense>
                {cachedPages.map((page) => (
                  <ListItem
                    key={page}
                    component="a"
                    href={page}
                    sx={{
                      color: '#60a5fa',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                      py: 0.5,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <Typography sx={{ color: '#60a5fa' }}>→</Typography>
                    </ListItemIcon>
                    <ListItemText primary={page === '/' ? 'Home' : page.replace('/', '')} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
