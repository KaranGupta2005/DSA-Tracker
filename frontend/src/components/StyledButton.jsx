import { motion } from 'framer-motion';
import MuiButton from '@mui/material/Button';
import Link from 'next/link';

const MotionButton = motion.create(MuiButton);

/**
 * StyledButton — replicates Model_NextJs-project StyledButton exactly.
 * Framer Motion-wrapped MUI Button with primary/secondary variants.
 * Primary: solid indigo background. Secondary: indigo border outline.
 * Both have whileTap and whileHover animations.
 *
 * Primary variant defaults to /login, secondary defaults to /leaderboard.
 */
export default function StyledButton({
  children,
  variant = 'primary',
  href,
  ...props
}) {
  const defaultHref = variant === 'primary' ? '/login' : '/leaderboard';
  const resolvedHref = href || defaultHref;

  const base =
    '!px-6 !py-3 !rounded-xl !text-lg font-semibold transition-all duration-300';

  const styles =
    variant === 'primary'
      ? '!bg-indigo-600 !text-white shadow-md hover:!bg-indigo-700'
      : '!border-2 !border-indigo-400 !text-indigo-300 hover:!bg-indigo-500 hover:!text-white';

  const hoverShadow =
    variant === 'primary'
      ? '0px 8px 25px rgba(99,102,241,0.6)'
      : '0px 8px 25px rgba(129,140,248,0.6)';

  return (
    <Link href={resolvedHref} passHref legacyBehavior>
      <MotionButton
        component="a"
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.07, boxShadow: hoverShadow }}
        className={`${base} ${styles}`}
        {...props}
      >
        {children}
      </MotionButton>
    </Link>
  );
}
