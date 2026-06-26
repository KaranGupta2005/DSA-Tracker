import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from 'framer-motion';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import StyledButton from '../components/StyledButton';
import Navbar from '../components/Navbar';
import api from '@/utils/api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * Convert a VAPID base64 string to a Uint8Array for pushManager.subscribe
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Landing Page with floating notification subscribe popup.
 */
export default function LandingPage() {
  const { scrollY } = useScroll();
  const prefersReducedMotion = useReducedMotion();

  // Popup state
  const [showPopup, setShowPopup] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState(''); // 'success' | 'error' | 'denied'
  const [subscribeMessage, setSubscribeMessage] = useState('');

  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const y = useTransform(scrollY, [0, 400], [0, -100]);

  // Show popup after 3 seconds, only if not already dismissed this session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = sessionStorage.getItem('notif-popup-dismissed');
    if (dismissed) return;

    const timer = setTimeout(() => setShowPopup(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismissPopup = () => {
    setShowPopup(false);
    sessionStorage.setItem('notif-popup-dismissed', 'true');
  };

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSubscribeStatus('error');
      setSubscribeMessage('Push notifications are not supported in this browser.');
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setSubscribeStatus('error');
      setSubscribeMessage('Notifications not configured.');
      return;
    }

    try {
      setSubscribing(true);
      setSubscribeStatus('');
      setSubscribeMessage('');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setSubscribeStatus('denied');
        setSubscribeMessage('Permission denied. Enable in browser settings.');
        return;
      }

      let registration;
      try {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
      } catch (e) {
        try {
          registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          await new Promise(resolve => setTimeout(resolve, 1000));
          registration = await navigator.serviceWorker.ready;
        } catch (regErr) {
          setSubscribeStatus('error');
          setSubscribeMessage('Service worker unavailable. Requires HTTPS.');
          return;
        }
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await api.post('/contests/subscribe', { subscription });

      setSubscribeStatus('success');
      setSubscribeMessage('You\'re subscribed to contest alerts!');
      // Auto-dismiss after 3s on success
      setTimeout(() => {
        setShowPopup(false);
        sessionStorage.setItem('notif-popup-dismissed', 'true');
      }, 3000);
    } catch (err) {
      console.error('Push subscription error:', err);
      if (err.response?.status === 401) {
        setSubscribeStatus('error');
        setSubscribeMessage('Please login first to subscribe.');
      } else {
        setSubscribeStatus('error');
        setSubscribeMessage('Failed to subscribe. Try again later.');
      }
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="w-full flex flex-col overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <motion.section
        style={prefersReducedMotion ? {} : { opacity, y }}
        className="relative h-screen w-full"
      >
        {/* Background Image with subtle scale animation */}
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/background.jpg')" }}
          initial={prefersReducedMotion ? {} : { scale: 1 }}
          animate={prefersReducedMotion ? {} : { scale: 1.05 }}
          transition={
            prefersReducedMotion
              ? {}
              : {
                  duration: 8,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'reverse',
                }
          }
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

        {/* Content — left aligned */}
        <motion.div
          className="relative container mx-auto flex flex-col items-start justify-center h-full px-6 md:px-12"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          <motion.h2
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2 }}
            className="text-indigo-400 text-2xl md:text-3xl font-semibold tracking-widest uppercase"
          >
            Welcome to
          </motion.h2>

          <motion.h1
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            className="text-white text-5xl md:text-6xl lg:text-7xl font-bold mt-4 leading-snug drop-shadow-lg"
          >
            IEEE DTU DSA Tracker
          </motion.h1>

          <motion.h2
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
            className="text-indigo-300 text-2xl md:text-3xl font-semibold mt-4"
          >
            Track. Compete. Level Up.
          </motion.h2>

          <motion.p
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.6 }}
            className="text-gray-300 text-lg md:text-xl mt-4 max-w-2xl leading-relaxed"
          >
            Your unified competitive programming platform. Track Codeforces &amp; LeetCode
            progress, compete on leaderboards, and level up with AI-powered insights.
          </motion.p>

          {/* Buttons */}
          <motion.div
            className="flex flex-wrap gap-4 mt-10"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.8 }}
          >
            <StyledButton href="/login" variant="primary">
              Get Started
            </StyledButton>
            <StyledButton href="/leaderboard" variant="secondary">
              View Leaderboard
            </StyledButton>
          </motion.div>
        </motion.div>

        {/* Scroll Down Indicator */}
        {!prefersReducedMotion && (
          <motion.div
            className="absolute bottom-8 right-8 cursor-pointer p-3 rounded-full bg-indigo-600/80 hover:bg-indigo-500 transition-all"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: [0, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <KeyboardArrowDownIcon className="!text-white !text-3xl" />
          </motion.div>
        )}
      </motion.section>

      {/* Floating Notification Subscribe Popup */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-48px)]"
          >
            <div className="relative bg-[#1a1a2e] border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden">
              {/* Glow accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

              {/* Close button */}
              <button
                onClick={dismissPopup}
                className="absolute top-3 right-3 p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
              >
                <CloseIcon className="!text-lg" />
              </button>

              <div className="px-5 pt-5 pb-4">
                {/* Icon + Title */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <NotificationsActiveIcon className="!text-indigo-400 !text-xl" />
                  </div>
                  <h3 className="text-white font-bold text-base">Contest Alerts</h3>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  Get notified before Codeforces & LeetCode contests start. Never miss a round again.
                </p>

                {/* Status messages */}
                {subscribeStatus === 'success' ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                    <CheckCircleIcon className="!text-lg" />
                    {subscribeMessage}
                  </div>
                ) : (
                  <>
                    {/* Subscribe button */}
                    <button
                      onClick={handleSubscribe}
                      disabled={subscribing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer hover:brightness-110 active:scale-[0.98]"
                      style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      }}
                    >
                      {subscribing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Subscribing...
                        </>
                      ) : (
                        <>
                          <NotificationsActiveIcon className="!text-base" />
                          Subscribe to Notifications
                        </>
                      )}
                    </button>

                    {/* Error/denied message */}
                    {subscribeMessage && (
                      <p className={`mt-2.5 text-xs text-center ${
                        subscribeStatus === 'error' || subscribeStatus === 'denied'
                          ? 'text-red-400'
                          : 'text-gray-500'
                      }`}>
                        {subscribeMessage}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
