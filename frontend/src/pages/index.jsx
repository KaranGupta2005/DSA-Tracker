import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import StyledButton from '../components/StyledButton';
import Boilerplate from '../components/Boilerplate';

/**
 * LandingPage component with hero section and parallax scroll effect.
 * Uses Framer Motion useScroll + useTransform for parallax.
 * Respects prefers-reduced-motion to disable parallax and entrance animations.
 * Excludes About, Advisory, Chapters, and Form sections.
 */
function LandingPage() {
  const heroRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // Parallax transforms — disabled when user prefers reduced motion
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Animation variants — simplified when reduced motion is preferred
  const headingVariants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.8, ease: 'easeOut' },
        },
      };

  const subheadingVariants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.8, delay: 0.2, ease: 'easeOut' },
        },
      };

  const buttonVariants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.8, delay: 0.4, ease: 'easeOut' },
        },
      };

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Parallax Background */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          y: prefersReducedMotion ? 0 : backgroundY,
        }}
      >
        {/* Gradient background with animated mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        </div>
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </motion.div>

      {/* Hero Content */}
      <motion.div
        className="relative z-10 text-center px-6 max-w-4xl mx-auto"
        style={{
          y: prefersReducedMotion ? 0 : textY,
          opacity: prefersReducedMotion ? 1 : opacity,
        }}
      >
        <motion.h1
          className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
          variants={headingVariants}
          initial="hidden"
          animate="visible"
        >
          IEEE DTU{' '}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            DSA Tracker
          </span>
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed"
          variants={subheadingVariants}
          initial="hidden"
          animate="visible"
        >
          Your unified competitive programming tracking platform. Track Codeforces &amp; LeetCode
          progress, compete on leaderboards, and level up with AI-powered insights.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          variants={buttonVariants}
          initial="hidden"
          animate="visible"
        >
          <StyledButton variant="primary">Get Started</StyledButton>
          <StyledButton variant="secondary">View Leaderboard</StyledButton>
        </motion.div>
      </motion.div>

      {/* Scroll indicator — hidden when reduced motion is preferred */}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-gray-400 flex items-start justify-center pt-2">
            <div className="w-1.5 h-3 bg-gray-400 rounded-full" />
          </div>
        </motion.div>
      )}
    </section>
  );
}

export default Boilerplate(LandingPage);
