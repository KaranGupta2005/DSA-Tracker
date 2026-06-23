import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import StyledButton from '../components/StyledButton';
import Navbar from '../components/Navbar';

/**
 * Landing Page — replicates the Model_NextJs-project hero section style.
 * Full-screen hero with background image, parallax, gradient overlay,
 * left-aligned content, staggered animations, and scroll-down indicator.
 * Excludes About, Advisory, Chapters, Form sections per spec.
 */
export default function LandingPage() {
  const { scrollY } = useScroll();
  const prefersReducedMotion = useReducedMotion();

  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const y = useTransform(scrollY, [0, 400], [0, -100]);

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
    </div>
  );
}
