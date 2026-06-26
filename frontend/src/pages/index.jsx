import { useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
 * Landing Page — replicates the Model_NextJs-project hero section style.
 * Full-screen hero with background image, parallax, gradient overlay,
 * left-aligned content, staggered animations, and scroll-down indicator.
 * Excludes About, Advisory, Chapters, Form sections per spec.
 */
export default function LandingPage() {
  const { scrollY } = useScroll();
  const prefersReducedMotion = useReducedMotion();
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState(''); // 'success' | 'error' | 'denied' | ''
  const [subscribeMessage, setSubscribeMessage] = useState('');

  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const y = useTransform(scrollY, [0, 400], [0, -100]);

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSubscribeStatus('error');
      setSubscribeMessage('Push notifications are not supported in this browser.');
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setSubscribeStatus('error');
      setSubscribeMessage('Push notifications are not configured.');
      return;
    }

    try {
      setSubscribing(true);
      setSubscribeStatus('');
      setSubscribeMessage('');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setSubscribeStatus('denied');
        setSubscribeMessage('Notification permission denied. Please enable notifications in browser settings.');
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
          setSubscribeMessage('Service worker not available. Push notifications require HTTPS.');
          return;
        }
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await api.post('/contests/subscribe', { subscription });

      setSubscribeStatus('success');
      setSubscribeMessage('Subscribed! You\'ll get contest reminders before they start.');
    } catch (err) {
      console.error('Push subscription error:', err);
      // If 401 (not logged in), show a helpful message
      if (err.response?.status === 401) {
        setSubscribeStatus('error');
        setSubscribeMessage('Please login first to subscribe to notifications.');
      } else {
        setSubscribeStatus('error');
        setSubscribeMessage('Failed to subscribe. Please login and try again.');
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

      {/* Subscribe to Notifications Section */}
      <section className="relative w-full py-20 bg-gradient-to-b from-black/90 to-gray-900">
        <motion.div
          className="container mx-auto px-6 md:px-12 text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <NotificationsActiveIcon className="!text-indigo-400 !text-4xl" />
              <h2 className="text-white text-3xl md:text-4xl font-bold">
                Never Miss a Contest
              </h2>
            </div>
            <p className="text-gray-300 text-lg mb-8">
              Get push notifications before Codeforces and LeetCode contests start.
              Stay ahead of the competition.
            </p>

            {subscribeStatus === 'success' ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-2 text-green-400 text-lg font-semibold"
              >
                <CheckCircleIcon className="!text-green-400" />
                {subscribeMessage}
              </motion.div>
            ) : (
              <>
                <motion.button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  whileHover={subscribing ? {} : { scale: 1.05 }}
                  whileTap={subscribing ? {} : { scale: 0.95 }}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-white text-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    boxShadow: '0 4px 24px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  {subscribing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    <>
                      <NotificationsActiveIcon />
                      Subscribe to Contest Alerts
                    </>
                  )}
                </motion.button>

                {subscribeMessage && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 text-sm ${
                      subscribeStatus === 'error' || subscribeStatus === 'denied'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {subscribeMessage}
                  </motion.p>
                )}
              </>
            )}

            <p className="text-gray-500 text-xs mt-6">
              You can unsubscribe anytime from the Contests page.
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
